import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { executePurchase } from "../helpers/purchaseHelper";
import { Id } from "../_generated/dataModel";

/**
 * Place an order: creates a unified order record and clears the cart.
 */
export const placeOrder = mutation({
  args: {
    deliveryMethod: v.union(v.literal("delivery"), v.literal("collection")),
    branchCollection: v.optional(v.id("branch")),
    address: v.optional(v.string()),
    selectedCity: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("ecocash"),
      v.literal("bank"),
    ),
    notes: v.optional(v.string()),
  },
  returns: v.id("order"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const isCollection = args.deliveryMethod === "collection";

    // Validate: collection requires a branch
    if (isCollection && !args.branchCollection) {
      throw new Error("A branch must be selected for collection orders");
    }

    // Validate: delivery requires an address and city
    if (!isCollection && !args.address) {
      throw new Error("A delivery address is required for delivery orders");
    }

    // 1. Fetch all cart items for the user
    const cartItems = await ctx.db
      .query("cartItem")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (cartItems.length === 0) {
      throw new Error("Cart is empty");
    }

    // 2. Fetch product details and build snapshot
    const itemsSnapshot: Array<{
      productId: Id<"products">;
      name: string;
      quantity: number;
      unitPriceInUSDCents: number;
      brandName: string | null;
    }> = [];
    const productIds: Array<Id<"products">> = [];
    let subtotalCents = 0;

    for (const cartItem of cartItems) {
      const product = await ctx.db.get(cartItem.productId);
      if (!product || product.isDeleted) continue;

      const unitPrice =
        product.promotionPriceInUSDCents ?? product.retailPriceInUSDCents;
      const lineTotal = unitPrice * cartItem.quantity;

      let brandName: string | null = null;
      if (product.brandId) {
        const brand = await ctx.db.get(product.brandId);
        if (brand && !brand.isDeleted) brandName = brand.name;
      }

      itemsSnapshot.push({
        productId: cartItem.productId,
        name: product.name,
        quantity: cartItem.quantity,
        unitPriceInUSDCents: unitPrice,
        brandName,
      });

      // Add productId once per unit for the order
      for (let i = 0; i < cartItem.quantity; i++) {
        productIds.push(cartItem.productId);
      }

      subtotalCents += lineTotal;
    }

    if (productIds.length === 0) {
      throw new Error("No valid products in cart");
    }

    // 3. Calculate delivery fee — collection is always free
    const settingsDoc = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    const deliveryPrice = settingsDoc?.deliveryPriceInUSDCents ?? 500;
    const freeThreshold = settingsDoc?.freeDeliveryThresholdInUSDCents ?? 5000;

    const deliveryFeeInUSDCents =
      !isCollection && subtotalCents < freeThreshold ? deliveryPrice : 0;
    const totalInUSDCents = subtotalCents + deliveryFeeInUSDCents;

    // 4. For delivery orders, resolve address; for collection, use branch address
    let orderAddress = args.address;
    if (isCollection && args.branchCollection) {
      const branch = await ctx.db.get(args.branchCollection);
      if (branch) {
        orderAddress = `${branch.address}, ${branch.city}`;
      }
    } else if (orderAddress && args.selectedCity) {
      orderAddress = `${orderAddress}, ${args.selectedCity}`;
    }

    // 5. Create unified order using shared helper
    const orderId = await executePurchase(ctx, null, {
      clientId: userId,
      productIds,
      productsAsJsonOnDateOfPurchase: JSON.stringify(itemsSnapshot),
      subtotalInUSDCents: subtotalCents,
      deliveryFeeInUSDCents,
      totalInUSDCents,
      uploadedPrescriptionIds: [],
      phoneNumber: args.phoneNumber,
      address: orderAddress,
      status: "pending",
      deliveryMethod: args.deliveryMethod,
      branchCollection: args.branchCollection,
      orderIsCollection: isCollection,
      paymentMethod: args.paymentMethod,
      notes: args.notes,
    });

    // 6. Update user profile: set selectedCity if provided and not already set
    if (args.selectedCity) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .unique();
      if (profile && !profile.selectedCity) {
        await ctx.db.patch(profile._id, {
          selectedCity: args.selectedCity,
          lastModifiedAt: Date.now(),
        });
      }
    }

    // 7. Clear the user's cart
    for (const cartItem of cartItems) {
      await ctx.db.delete(cartItem._id);
    }

    return orderId;
  },
});

/**
 * List orders for the logged-in user, newest first.
 * Enriches each order's product snapshot with medication flags for censoring.
 */
export const listMyOrders = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const orders = await ctx.db
      .query("order")
      .withIndex("by_clientId", (q) => q.eq("clientId", userId))
      .order("desc")
      .collect();

    // For each order, look up actual product data to add medication flags
    const productCache = new Map<
      string,
      { isMedicine: boolean; isPrescriptionControlled: boolean }
    >();
    const enrichedOrders = [];

    for (const order of orders) {
      const items = JSON.parse(order.productsAsJsonOnDateOfPurchase);
      const enrichedItems = [];

      for (const item of items) {
        let flags = productCache.get(item.productId);
        if (!flags) {
          const product = await ctx.db.get(item.productId as Id<"products">);
          flags = {
            isMedicine: product?.isMedicine ?? false,
            isPrescriptionControlled:
              product?.isPrescriptionControlled ?? false,
          };
          productCache.set(item.productId, flags);
        }
        enrichedItems.push({
          ...item,
          isMedicine: item.isMedicine ?? flags.isMedicine,
          isPrescriptionControlled:
            item.isPrescriptionControlled ?? flags.isPrescriptionControlled,
        });
      }

      enrichedOrders.push({
        ...order,
        productsAsJsonOnDateOfPurchase: JSON.stringify(enrichedItems),
      });
    }

    return enrichedOrders;
  },
});

/**
 * Get a single order by ID (must belong to the logged-in user).
 * Enriches with branch details and medication flags for censoring.
 */
export const getOrder = query({
  args: { orderId: v.id("order") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.orderId);
    if (!order || order.clientId !== userId) return null;

    // Enrich with branch details if collection order
    let branchDetails = null;
    if (order.branchCollection) {
      branchDetails = await ctx.db.get(order.branchCollection);
    }

    // Enrich items with medication flags
    const items = JSON.parse(order.productsAsJsonOnDateOfPurchase);
    const enrichedItems = [];
    for (const item of items) {
      const product = await ctx.db.get(item.productId as Id<"products">);
      enrichedItems.push({
        ...item,
        isMedicine: item.isMedicine ?? product?.isMedicine ?? false,
        isPrescriptionControlled:
          item.isPrescriptionControlled ??
          product?.isPrescriptionControlled ??
          false,
      });
    }

    return {
      ...order,
      branchDetails,
      productsAsJsonOnDateOfPurchase: JSON.stringify(enrichedItems),
    };
  },
});

/**
 * Get non-medicine products the user has previously purchased (unique list),
 * enriched with current product data and brand names.
 */
export const getMyPurchasedProducts = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const orders = await ctx.db
      .query("order")
      .withIndex("by_clientId", (q) => q.eq("clientId", userId))
      .collect();

    // Collect unique product IDs across all orders
    const uniqueIds = new Set<Id<"products">>();
    for (const order of orders) {
      for (const pid of order.productIds) {
        uniqueIds.add(pid);
      }
    }

    const brandCache = new Map<string, string>();
    const results = [];

    for (const pid of uniqueIds) {
      const product = await ctx.db.get(pid);
      if (!product || product.isDeleted) continue;
      // Only non-medicine products
      if (product.isMedicine) continue;

      let brandName: string | null = null;
      if (product.brandId) {
        if (brandCache.has(product.brandId)) {
          brandName = brandCache.get(product.brandId) ?? null;
        } else {
          const brand = await ctx.db.get(product.brandId);
          if (brand && !brand.isDeleted) {
            brandName = brand.name;
            brandCache.set(product.brandId, brand.name);
          }
        }
      }

      results.push({
        ...product,
        brandName,
      });
    }

    return results;
  },
});

/**
 * Find the order linked to a given prescription (for the logged-in user).
 * Returns the order ID or null if not found.
 */
export const getOrderForPrescription = query({
  args: { prescriptionId: v.id("uploadedPrescription") },
  returns: v.union(v.id("order"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const orders = await ctx.db
      .query("order")
      .withIndex("by_clientId", (q) => q.eq("clientId", userId))
      .order("desc")
      .collect();

    for (const order of orders) {
      if (
        order.uploadedPrescriptionIds &&
        order.uploadedPrescriptionIds.includes(args.prescriptionId)
      ) {
        return order._id;
      }
    }

    return null;
  },
});

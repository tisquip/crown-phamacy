import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "../_generated/dataModel";
import { executePurchase } from "../helpers/purchaseHelper";
import { internal } from "../_generated/api";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Get all pending prescription orders for the logged-in user.
 * Auto-expires any orders that are past 24 hours.
 */
export const getMyPendingPrescriptionOrders = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const orders = await ctx.db
      .query("prescriptionOrder")
      .withIndex("by_clientId_and_status", (q) =>
        q.eq("clientId", userId).eq("status", "pending"),
      )
      .collect();

    // Filter out expired (query can't mutate, so just mark expired for UI)
    const now = Date.now();
    return orders.map((order) => ({
      ...order,
      isExpired: now > order.expiresAt,
    }));
  },
});

/**
 * Get a single prescription order by ID (must belong to the logged-in user).
 */
export const getPrescriptionOrder = query({
  args: { id: v.id("prescriptionOrder") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db.get(args.id);
    if (!order || order.clientId !== userId) return null;

    return {
      ...order,
      isExpired: Date.now() > order.expiresAt,
    };
  },
});

/**
 * Get the prescription order for a given prescription (must belong to the logged-in user).
 */
export const getOrderForPrescription = query({
  args: { prescriptionId: v.id("uploadedPrescription") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const order = await ctx.db
      .query("prescriptionOrder")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId),
      )
      .order("desc")
      .first();

    if (!order || order.clientId !== userId) return null;

    return {
      ...order,
      isExpired: Date.now() > order.expiresAt,
    };
  },
});

/**
 * Cancel a prescription order. Resets the prescription status back to "Uploaded".
 */
export const cancelPrescriptionOrder = mutation({
  args: { id: v.id("prescriptionOrder") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("Prescription order not found");
    if (order.clientId !== userId) throw new Error("Not authorized");
    if (order.status !== "pending") {
      throw new Error("Only pending prescription orders can be cancelled");
    }

    const now = Date.now();

    await ctx.db.patch(args.id, {
      status: "cancelled",
      lastModifiedBy: userId,
      lastModifiedAt: now,
    });

    // Reset prescription status back to Uploaded
    await ctx.db.patch(order.prescriptionId, {
      status: "Uploaded",
      lastModifiedBy: userId,
      lastModifiedAt: now,
    });

    return null;
  },
});

/**
 * Purchase a prescription order — converts it into a real order.
 * Checks 24-hour expiry. If expired, auto-cancels instead.
 */
export const purchasePrescriptionOrder = mutation({
  args: {
    prescriptionOrderId: v.id("prescriptionOrder"),
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

    const prescriptionOrder = await ctx.db.get(args.prescriptionOrderId);
    if (!prescriptionOrder) throw new Error("Prescription order not found");
    if (prescriptionOrder.clientId !== userId)
      throw new Error("Not authorized");
    if (prescriptionOrder.status !== "pending") {
      throw new Error("This prescription order has already been processed");
    }

    const now = Date.now();

    // Check expiry
    if (now > prescriptionOrder.expiresAt) {
      // Auto-cancel
      await ctx.db.patch(args.prescriptionOrderId, {
        status: "expired",
        lastModifiedBy: userId,
        lastModifiedAt: now,
      });
      await ctx.db.patch(prescriptionOrder.prescriptionId, {
        status: "Uploaded",
        lastModifiedBy: userId,
        lastModifiedAt: now,
      });
      throw new Error(
        "This prescription order has expired (more than 24 hours). It has been cancelled.",
      );
    }

    const isCollection = args.deliveryMethod === "collection";

    if (isCollection && !args.branchCollection) {
      throw new Error("A branch must be selected for collection orders");
    }
    if (!isCollection && !args.address) {
      throw new Error("A delivery address is required for delivery orders");
    }

    // Calculate delivery fee
    const settingsDoc = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();
    const deliveryPrice = settingsDoc?.deliveryPriceInUSDCents ?? 500;
    const freeThreshold = settingsDoc?.freeDeliveryThresholdInUSDCents ?? 5000;

    const deliveryFeeInUSDCents =
      !isCollection && prescriptionOrder.subtotalInUSDCents < freeThreshold
        ? deliveryPrice
        : 0;
    const totalInUSDCents =
      prescriptionOrder.subtotalInUSDCents + deliveryFeeInUSDCents;

    // Resolve address
    let orderAddress = args.address;
    if (isCollection && args.branchCollection) {
      const branch = await ctx.db.get(args.branchCollection);
      if (branch) {
        orderAddress = `${branch.address}, ${branch.city}`;
      }
    } else if (orderAddress && args.selectedCity) {
      orderAddress = `${orderAddress}, ${args.selectedCity}`;
    }

    // Create real order via shared helper
    const orderId = await executePurchase(ctx, null, {
      clientId: userId,
      productIds: prescriptionOrder.productIds,
      productsAsJsonOnDateOfPurchase: prescriptionOrder.productsAsJson,
      subtotalInUSDCents: prescriptionOrder.subtotalInUSDCents,
      deliveryFeeInUSDCents,
      totalInUSDCents,
      uploadedPrescriptionIds: [prescriptionOrder.prescriptionId],
      phoneNumber: args.phoneNumber,
      address: orderAddress,
      status: "pending",
      deliveryMethod: args.deliveryMethod,
      branchCollection: args.branchCollection,
      orderIsCollection: isCollection,
      paymentMethod: args.paymentMethod,
      notes: args.notes,
    });

    // Update user profile city if provided
    if (args.selectedCity) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .unique();
      if (profile && !profile.selectedCity) {
        await ctx.db.patch(profile._id, {
          selectedCity: args.selectedCity,
          lastModifiedAt: now,
        });
      }
    }

    // Mark prescription order as purchased
    await ctx.db.patch(args.prescriptionOrderId, {
      status: "purchased",
      resultingOrderId: orderId,
      lastModifiedBy: userId,
      lastModifiedAt: now,
    });

    // Mark prescription as Purchased
    await ctx.db.patch(prescriptionOrder.prescriptionId, {
      status: "Purchased",
      lastModifiedBy: userId,
      lastModifiedAt: now,
    });

    // Schedule order notification email (fire-and-forget)
    await ctx.scheduler.runAfter(
      0,
      internal.helpers.notifications.notifyNewOrder,
      { orderId },
    );

    return orderId;
  },
});

/**
 * Auto-expire a prescription order if accessed after 24 hours.
 * Called from the UI when user opens an expired prescription order.
 */
export const expirePrescriptionOrder = mutation({
  args: { id: v.id("prescriptionOrder") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.id);
    if (!order) throw new Error("Prescription order not found");
    if (order.clientId !== userId) throw new Error("Not authorized");
    if (order.status !== "pending") return null;

    const now = Date.now();
    if (now > order.expiresAt) {
      await ctx.db.patch(args.id, {
        status: "expired",
        lastModifiedBy: userId,
        lastModifiedAt: now,
      });
      // Reset prescription status
      await ctx.db.patch(order.prescriptionId, {
        status: "Uploaded",
        lastModifiedBy: userId,
        lastModifiedAt: now,
      });
    }

    return null;
  },
});

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the full cart for the logged-in user, enriched with product data.
 */
export const getCart = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const cartItems = await ctx.db
      .query("cartItem")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const brandCache = new Map<string, string>();
    const enriched = [];

    for (const item of cartItems) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.isDeleted) continue;

      let brandName: string | undefined;
      if (product.brandId) {
        if (brandCache.has(product.brandId)) {
          brandName = brandCache.get(product.brandId);
        } else {
          const brand = await ctx.db.get(product.brandId);
          if (brand && !brand.isDeleted) {
            brandName = brand.name;
            brandCache.set(product.brandId, brand.name);
          }
        }
      }

      enriched.push({
        _cartItemId: item._id,
        quantity: item.quantity,
        product: {
          ...product,
          brandName: brandName ?? null,
        },
      });
    }

    return enriched;
  },
});

/**
 * Get cart item count for the logged-in user (for header badge).
 */
export const getCartItemCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const cartItems = await ctx.db
      .query("cartItem")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  },
});

/**
 * Add a product to the cart (or increment quantity if already present).
 */
export const addToCart = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Block prescription-controlled products for non-admins
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    if (product.isPrescriptionControlled) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .unique();
      if (!profile?.isAdmin) {
        throw new Error(
          "Prescription-controlled products cannot be added to cart",
        );
      }
    }

    // Block medicine products unless the user has previously purchased them
    if (product.isMedicine) {
      const record = await ctx.db
        .query("medicationPurchasedByClient")
        .withIndex("by_clientId_and_productId", (q) =>
          q.eq("clientId", userId).eq("productId", args.productId),
        )
        .unique();
      if (!record) {
        throw new Error(
          "Medicine products can only be re-ordered after a previous purchase",
        );
      }
    }

    const existing = await ctx.db
      .query("cartItem")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + 1,
        lastModifiedAt: Date.now(),
        lastModifiedBy: userId,
      });
    } else {
      await ctx.db.insert("cartItem", {
        userId,
        productId: args.productId,
        quantity: 1,
        lastModifiedBy: userId,
        lastModifiedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Add a product to the cart with an exact quantity (upsert).
 * Prescription-controlled products are blocked for non-admins.
 * Used by the reorder flow to restore the original order quantities.
 */
export const addToCartWithQuantity = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Block prescription-controlled products for non-admins
    if (product.isPrescriptionControlled) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .unique();
      if (!profile?.isAdmin) {
        throw new Error(
          "Prescription-controlled products cannot be added to cart",
        );
      }
    }

    // Block medicine products unless the user has previously purchased them
    if (product.isMedicine) {
      const record = await ctx.db
        .query("medicationPurchasedByClient")
        .withIndex("by_clientId_and_productId", (q) =>
          q.eq("clientId", userId).eq("productId", args.productId),
        )
        .unique();
      if (!record) {
        throw new Error(
          "Medicine products can only be re-ordered after a previous purchase",
        );
      }
    }

    const quantity = Math.max(1, Math.round(args.quantity));

    const existing = await ctx.db
      .query("cartItem")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity,
        lastModifiedAt: Date.now(),
        lastModifiedBy: userId,
      });
    } else {
      await ctx.db.insert("cartItem", {
        userId,
        productId: args.productId,
        quantity,
        lastModifiedBy: userId,
        lastModifiedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Remove a product from the cart entirely.
 */
export const removeFromCart = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("cartItem")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return null;
  },
});

/**
 * Update the quantity of a cart item. If quantity <= 0, removes the item.
 */
export const updateQuantity = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("cartItem")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .unique();

    if (!existing) return null;

    if (args.quantity <= 0) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.patch(existing._id, {
        quantity: args.quantity,
        lastModifiedAt: Date.now(),
        lastModifiedBy: userId,
      });
    }

    return null;
  },
});

/**
 * Clear all items in the user's cart.
 */
export const clearCart = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const cartItems = await ctx.db
      .query("cartItem")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    for (const item of cartItems) {
      await ctx.db.delete(item._id);
    }

    return null;
  },
});

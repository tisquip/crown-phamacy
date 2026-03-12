import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get all wishlist product IDs for the logged-in user.
 */
export const getWishlist = query({
  args: {},
  returns: v.array(v.id("products")),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("wishlistItem")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return items.map((item) => item.productId);
  },
});

/**
 * Get full wishlist products (enriched) for the logged-in user.
 */
export const getWishlistProducts = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("wishlistItem")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const brandCache = new Map<string, string>();
    const enriched = [];

    for (const item of items) {
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
        ...product,
        brandName: brandName ?? null,
      });
    }

    return enriched;
  },
});

/**
 * Add a product to the user's wishlist.
 */
export const addToWishlist = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already in wishlist
    const existing = await ctx.db
      .query("wishlistItem")
      .withIndex("by_userId_and_productId", (q) =>
        q.eq("userId", userId).eq("productId", args.productId),
      )
      .unique();

    if (existing) return null;

    await ctx.db.insert("wishlistItem", {
      userId,
      productId: args.productId,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Remove a product from the user's wishlist.
 */
export const removeFromWishlist = mutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("wishlistItem")
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

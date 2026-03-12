import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List active (non-deleted) products for the public storefront.
 *
 * Products where `isMedicine` or `isPrescriptionControlled` is true are
 * excluded by default.  When a logged-in user has previously purchased
 * such a product (tracked via `medicationPurchasedByClient`), those
 * products are included so the user can re-order.
 *
 * Each product is enriched with:
 *  - `brandName`  – resolved from `productBrand`
 *  - `categoryNames` – resolved from `productCategory`
 */
export const listPublic = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    // Fetch all non-deleted products
    const allProducts = await ctx.db
      .query("products")
      .withIndex("by_isDeleted_and_name", (q) => q.eq("isDeleted", undefined))
      .collect();

    // Determine the logged-in user's previously purchased medication IDs
    const userId = await getAuthUserId(ctx);
    const purchasedMedProductIds = new Set<string>();

    if (userId) {
      const medicationPurchases = await ctx.db
        .query("medicationPurchasedByClient")
        .withIndex("by_clientId_and_productId", (q) => q.eq("clientId", userId))
        .collect();
      for (const mp of medicationPurchases) {
        purchasedMedProductIds.add(mp.productId);
      }
    }

    // Filter:
    // - isPrescriptionControlled products are NEVER shown on the storefront
    // - isMedicine products are only shown if the user has previously purchased them
    const eligible = allProducts.filter((p) => {
      if (p.isPrescriptionControlled) {
        return false;
      }
      if (p.isMedicine) {
        return purchasedMedProductIds.has(p._id);
      }
      return true;
    });

    // Resolve brands & categories in bulk to avoid N+1 inside the map
    const brandCache = new Map<string, string>();
    const categoryCache = new Map<string, string>();

    const enriched = [];
    for (const product of eligible) {
      // Brand
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

      // Categories
      const categoryNames: string[] = [];
      if (product.productCategoryIds) {
        for (const catId of product.productCategoryIds) {
          if (categoryCache.has(catId)) {
            categoryNames.push(categoryCache.get(catId)!);
          } else {
            const cat = await ctx.db.get(catId);
            if (cat && !cat.isDeleted) {
              categoryNames.push(cat.name);
              categoryCache.set(catId, cat.name);
            }
          }
        }
      }

      enriched.push({
        ...product,
        brandName: brandName ?? null,
        categoryNames,
      });
    }

    return enriched;
  },
});

/**
 * Fetch a single product by ID for the product detail page.
 *
 * Unlike `listPublic`, this query applies NO visibility filtering — it will
 * return prescription-controlled and medicine-only products so the detail
 * page can always be rendered.
 *
 * Returns null if the product doesn't exist or has been soft-deleted.
 * Also returns `hasPreviouslyPurchased` so the UI can gate the add-to-cart
 * button for medicine products.
 */
export const getById = query({
  args: { productId: v.id("products") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) return null;

    // Resolve brand name
    let brandName: string | null = null;
    if (product.brandId) {
      const brand = await ctx.db.get(product.brandId);
      if (brand && !brand.isDeleted) brandName = brand.name;
    }

    // Resolve category names
    const categoryNames: string[] = [];
    if (product.productCategoryIds) {
      for (const catId of product.productCategoryIds) {
        const cat = await ctx.db.get(catId);
        if (cat && !cat.isDeleted) categoryNames.push(cat.name);
      }
    }

    // Check if the logged-in user has previously purchased this product
    const userId = await getAuthUserId(ctx);
    let hasPreviouslyPurchased = false;
    if (userId) {
      const record = await ctx.db
        .query("medicationPurchasedByClient")
        .withIndex("by_clientId_and_productId", (q) =>
          q.eq("clientId", userId).eq("productId", args.productId),
        )
        .unique();
      hasPreviouslyPurchased = record !== null;
    }

    return { ...product, brandName, categoryNames, hasPreviouslyPurchased };
  },
});

/**
 * List active brands (non-deleted) for the storefront sidebar.
 */
export const listBrands = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("productBrand")
      .withIndex("by_isDeleted_and_name", (q) => q.eq("isDeleted", undefined))
      .collect();
  },
});

/**
 * List active categories (non-deleted) for the storefront sidebar.
 */
export const listCategories = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("productCategory")
      .withIndex("by_isDeleted_and_name", (q) => q.eq("isDeleted", undefined))
      .collect();
  },
});

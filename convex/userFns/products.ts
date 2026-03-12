import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * List active (non-deleted) products for the public storefront.
 *
 * Products where `isMedicine` or `isPrescriptionControlled` is true are
 * always excluded — these can only be purchased via prescription orders.
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

    // Filter out all medicine and prescription-controlled products
    const eligible = allProducts.filter((p) => {
      if (p.isPrescriptionControlled) return false;
      if (p.isMedicine) return false;
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
 * Medicine and prescription-controlled products are no longer viewable
 * by regular users. Returns null for such products unless the user is
 * an admin.
 */
export const getById = query({
  args: { productId: v.id("products") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) return null;

    // Block medicine and prescription-controlled products for non-admins
    if (product.isMedicine || product.isPrescriptionControlled) {
      const userId = await getAuthUserId(ctx);
      if (userId) {
        const profile = await ctx.db
          .query("userProfile")
          .withIndex("byUserId", (q) => q.eq("userId", userId))
          .unique();
        if (!profile?.isAdmin) return null;
      } else {
        return null;
      }
    }

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

    return { ...product, brandName, categoryNames };
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

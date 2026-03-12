import { query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Get the products for a homepage section (topSellers, itemsOnPromotion, promoBanner).
 * Returns enriched product data with brand names and first image storage ID.
 * Excludes medicine and prescription-controlled products as a safety net.
 */
export const getSectionProducts = query({
  args: {
    sectionType: v.union(
      v.literal("topSellers"),
      v.literal("itemsOnPromotion"),
      v.literal("promoBanner"),
    ),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const section = await ctx.db
      .query("homepageSection")
      .withIndex("by_sectionType", (q) => q.eq("sectionType", args.sectionType))
      .unique();

    if (!section || !section.productIds || section.productIds.length === 0) {
      return [];
    }

    const products = [];
    for (const productId of section.productIds) {
      const product = await ctx.db.get(productId);
      if (!product) continue;
      if (product.isDeleted) continue;
      // Safety: never return medicine or prescription-controlled products
      if (product.isMedicine || product.isPrescriptionControlled) continue;

      // Resolve brand name
      let brandName: string | null = null;
      if (product.brandId) {
        const brand = await ctx.db.get(product.brandId);
        if (brand && !brand.isDeleted) {
          brandName = brand.name;
        }
      }

      // Resolve first image URL
      let imageStorageId: string | null = null;
      if (product.storageIdsImages && product.storageIdsImages.length > 0) {
        imageStorageId = product.storageIdsImages[0];
      }

      products.push({
        ...product,
        brandName,
        imageStorageId,
      });

      // Limit to 35 products
      if (products.length >= 35) break;
    }

    return products;
  },
});

/**
 * Get the categories for the "Shop by Category" homepage section.
 * Returns category objects with names and image storage IDs.
 */
export const getSectionCategories = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const section = await ctx.db
      .query("homepageSection")
      .withIndex("by_sectionType", (q) => q.eq("sectionType", "shopByCategory"))
      .unique();

    if (!section || !section.categoryIds || section.categoryIds.length === 0) {
      return [];
    }

    const categories = [];
    for (const categoryId of section.categoryIds) {
      const category = await ctx.db.get(categoryId);
      if (!category) continue;
      if (category.isDeleted) continue;
      categories.push(category);
    }

    return categories;
  },
});

/**
 * Fallback: get top-selling non-medicine products by purchaseCount.
 * Used when no section configuration exists.
 */
export const getTopSellingProducts = query({
  args: { limit: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_isDeleted_and_purchaseCount", (q) =>
        q.eq("isDeleted", undefined),
      )
      .order("desc")
      .collect();

    const eligible = products
      .filter((p) => !p.isMedicine && !p.isPrescriptionControlled)
      .slice(0, args.limit);

    const result = [];
    for (const product of eligible) {
      let brandName: string | null = null;
      if (product.brandId) {
        const brand = await ctx.db.get(product.brandId);
        if (brand && !brand.isDeleted) {
          brandName = brand.name;
        }
      }
      result.push({ ...product, brandName });
    }

    return result;
  },
});

/**
 * Get the promo banner configuration for display on the homepage.
 * Returns image storage ID, badge text, headline, button text, and button link.
 */
export const getPromoBanner = query({
  args: {},
  returns: v.union(
    v.object({
      storageId: v.optional(v.id("_storage")),
      cdnImageUrl: v.optional(v.string()),
      cdnImageKey: v.optional(v.string()),
      badgeText: v.optional(v.string()),
      headlineText: v.optional(v.string()),
      buttonText: v.optional(v.string()),
      buttonLink: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const section = await ctx.db
      .query("homepageSection")
      .withIndex("by_sectionType", (q) => q.eq("sectionType", "promoBanner"))
      .unique();

    if (!section) return null;
    return {
      storageId: section.storageId,
      cdnImageUrl: section.cdnImageUrl,
      cdnImageKey: section.cdnImageKey,
      badgeText: section.badgeText,
      headlineText: section.headlineText,
      buttonText: section.buttonText,
      buttonLink: section.buttonLink,
    };
  },
}); /**
 * Fallback: get products on promotion sorted by purchaseCount.
 * Used when no section configuration exists.
 */
export const getPromotionProducts = query({
  args: { limit: v.number() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_isDeleted_and_promotionPrice", (q) =>
        q.eq("isDeleted", undefined),
      )
      .order("desc")
      .collect();

    const eligible = products
      .filter(
        (p) =>
          !p.isMedicine &&
          !p.isPrescriptionControlled &&
          p.promotionPriceInUSDCents !== undefined,
      )
      .sort((a, b) => (b.purchaseCount ?? 0) - (a.purchaseCount ?? 0))
      .slice(0, args.limit);

    const result = [];
    for (const product of eligible) {
      let brandName: string | null = null;
      if (product.brandId) {
        const brand = await ctx.db.get(product.brandId);
        if (brand && !brand.isDeleted) {
          brandName = brand.name;
        }
      }
      result.push({ ...product, brandName });
    }

    return result;
  },
});

/**
 * Get the featured brands for the homepage.
 * Returns brand objects (id, name) from the homepageSection config.
 * Falls back to an empty array if not configured.
 */
export const getFeaturedBrands = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("productBrand"),
      name: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const section = await ctx.db
      .query("homepageSection")
      .withIndex("by_sectionType", (q) => q.eq("sectionType", "featuredBrands"))
      .unique();

    if (!section || !section.brandIds || section.brandIds.length === 0) {
      return [];
    }

    const brands = [];
    for (const brandId of section.brandIds) {
      const brand = await ctx.db.get(brandId);
      if (!brand || brand.isDeleted) continue;
      brands.push({ _id: brand._id, name: brand.name });
    }

    return brands;
  },
});

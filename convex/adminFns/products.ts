import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";

export const list = query({
  args: {
    includeDeleted: v.optional(v.boolean()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (args.includeDeleted) {
      return await ctx.db.query("products").collect();
    }
    return await ctx.db
      .query("products")
      .withIndex("by_isDeleted_and_name", (q) => q.eq("isDeleted", undefined))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("products") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    stockCode: v.string(),
    description: v.string(),
    detailedDescription: v.optional(v.string()),
    barcode: v.optional(v.string()),
    brandId: v.optional(v.id("productBrand")),
    productCategoryIds: v.optional(v.array(v.id("productCategory"))),
    storageIdsImages: v.optional(v.array(v.id("_storage"))),
    cdnImages: v.optional(
      v.array(v.object({ url: v.string(), key: v.string() })),
    ),
    retailPriceInUSDCents: v.number(),
    promotionPriceInUSDCents: v.optional(v.number()),
    bulkOfferPriceInUSDCents: v.optional(v.number()),
    bulkOfferQty: v.optional(v.number()),
    isMedicine: v.boolean(),
    isPrescriptionControlled: v.boolean(),
    inStock: v.boolean(),
    packSize: v.optional(v.string()),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("products", {
      ...args,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    stockCode: v.string(),
    description: v.string(),
    detailedDescription: v.optional(v.string()),
    barcode: v.optional(v.string()),
    brandId: v.optional(v.id("productBrand")),
    productCategoryIds: v.optional(v.array(v.id("productCategory"))),
    storageIdsImages: v.optional(v.array(v.id("_storage"))),
    cdnImages: v.optional(
      v.array(v.object({ url: v.string(), key: v.string() })),
    ),
    retailPriceInUSDCents: v.number(),
    promotionPriceInUSDCents: v.optional(v.number()),
    bulkOfferPriceInUSDCents: v.optional(v.number()),
    bulkOfferQty: v.optional(v.number()),
    isMedicine: v.boolean(),
    isPrescriptionControlled: v.boolean(),
    inStock: v.boolean(),
    packSize: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const { id, ...fields } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Product not found");

    // Delete CDN images that were removed
    const oldKeys = new Set((existing.cdnImages ?? []).map((img) => img.key));
    const newKeys = new Set((args.cdnImages ?? []).map((img) => img.key));
    for (const oldKey of oldKeys) {
      if (!newKeys.has(oldKey)) {
        await ctx.scheduler.runAfter(0, api.cdn.deleteFile, { key: oldKey });
      }
    }

    await ctx.db.patch(id, {
      ...fields,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Product not found");

    // Schedule CDN image deletions
    for (const img of existing.cdnImages ?? []) {
      await ctx.scheduler.runAfter(0, api.cdn.deleteFile, { key: img.key });
    }

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: userId,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

export const restore = mutation({
  args: { id: v.id("products") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Product not found");

    await ctx.db.patch(args.id, {
      isDeleted: undefined,
      deletedAt: undefined,
      deletedBy: undefined,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

// ── Lightweight bulk-operation patches ────────────────────────────────────────

export const patchBrand = mutation({
  args: {
    id: v.id("products"),
    brandId: v.optional(v.id("productBrand")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Product not found");
    await ctx.db.patch(args.id, {
      brandId: args.brandId,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

export const addToCategory = mutation({
  args: {
    id: v.id("products"),
    categoryId: v.id("productCategory"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Product not found");
    const current = existing.productCategoryIds ?? [];
    if (!current.includes(args.categoryId)) {
      await ctx.db.patch(args.id, {
        productCategoryIds: [...current, args.categoryId],
        lastModifiedBy: userId,
        lastModifiedAt: Date.now(),
      });
    }
    return null;
  },
});

export const patchCdnImages = mutation({
  args: {
    id: v.id("products"),
    cdnImages: v.array(v.object({ url: v.string(), key: v.string() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Product not found");

    // Delete CDN images that were removed
    const oldKeys = new Set(
      (existing.cdnImages ?? []).map((img: { key: string }) => img.key),
    );
    const newKeys = new Set(args.cdnImages.map((img) => img.key));
    for (const oldKey of oldKeys) {
      if (!newKeys.has(oldKey)) {
        await ctx.scheduler.runAfter(0, api.cdn.deleteFile, { key: oldKey });
      }
    }

    await ctx.db.patch(args.id, {
      cdnImages: args.cdnImages,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

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
      return await ctx.db.query("productCategory").collect();
    }
    return await ctx.db
      .query("productCategory")
      .withIndex("by_isDeleted_and_name", (q) => q.eq("isDeleted", undefined))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("productCategory") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    storageIdImage: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
  },
  returns: v.id("productCategory"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("productCategory", {
      name: args.name,
      description: args.description,
      storageIdImage: args.storageIdImage,
      cdnImageUrl: args.cdnImageUrl,
      cdnImageKey: args.cdnImageKey,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("productCategory"),
    name: v.string(),
    description: v.optional(v.string()),
    storageIdImage: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Category not found");

    // Delete old CDN image if it changed
    if (existing.cdnImageKey && existing.cdnImageKey !== args.cdnImageKey) {
      await ctx.scheduler.runAfter(0, api.cdn.deleteFile, {
        key: existing.cdnImageKey,
      });
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      storageIdImage: args.storageIdImage,
      cdnImageUrl: args.cdnImageUrl,
      cdnImageKey: args.cdnImageKey,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("productCategory") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Category not found");

    // Schedule CDN image deletion
    if (existing.cdnImageKey) {
      await ctx.scheduler.runAfter(0, api.cdn.deleteFile, {
        key: existing.cdnImageKey,
      });
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
  args: { id: v.id("productCategory") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Category not found");

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

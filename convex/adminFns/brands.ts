import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    includeDeleted: v.optional(v.boolean()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    if (args.includeDeleted) {
      return await ctx.db.query("productBrand").collect();
    }
    return await ctx.db
      .query("productBrand")
      .withIndex("by_isDeleted_and_name", (q) => q.eq("isDeleted", undefined))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("productBrand") },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("productBrand"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("productBrand", {
      name: args.name,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("productBrand"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Brand not found");

    await ctx.db.patch(args.id, {
      name: args.name,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

export const softDelete = mutation({
  args: { id: v.id("productBrand") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Brand not found");

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
  args: { id: v.id("productBrand") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Brand not found");

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

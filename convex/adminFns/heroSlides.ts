import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";

/** List all slides (admin), ordered by `order` ascending. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("heroSlide"),
      _creationTime: v.number(),
      title: v.string(),
      subtitle: v.string(),
      image: v.optional(v.id("_storage")),
      cdnImageUrl: v.optional(v.string()),
      cdnImageKey: v.optional(v.string()),
      buttonText: v.string(),
      buttonLink: v.string(),
      active: v.boolean(),
      order: v.number(),
      lastModifiedBy: v.optional(v.id("users")),
      lastModifiedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("heroSlide")
      .withIndex("by_order")
      .order("asc")
      .collect();
  },
});

/** List only active slides ordered by `order` — used by the public HeroCarousel. */
export const listActive = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("heroSlide"),
      _creationTime: v.number(),
      title: v.string(),
      subtitle: v.string(),
      image: v.optional(v.id("_storage")),
      cdnImageUrl: v.optional(v.string()),
      cdnImageKey: v.optional(v.string()),
      buttonText: v.string(),
      buttonLink: v.string(),
      active: v.boolean(),
      order: v.number(),
      lastModifiedBy: v.optional(v.id("users")),
      lastModifiedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("heroSlide")
      .withIndex("by_active_and_order", (q) => q.eq("active", true))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    subtitle: v.string(),
    image: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    buttonText: v.string(),
    buttonLink: v.string(),
    active: v.boolean(),
    order: v.number(),
  },
  returns: v.id("heroSlide"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("heroSlide", {
      ...args,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("heroSlide"),
    title: v.string(),
    subtitle: v.string(),
    image: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    buttonText: v.string(),
    buttonLink: v.string(),
    active: v.boolean(),
    order: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing?.cdnImageKey && existing.cdnImageKey !== args.cdnImageKey) {
      await ctx.scheduler.runAfter(0, api.cdn.deleteFile, {
        key: existing.cdnImageKey,
      });
    }

    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("heroSlide") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (existing?.cdnImageKey) {
      await ctx.scheduler.runAfter(0, api.cdn.deleteFile, {
        key: existing.cdnImageKey,
      });
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

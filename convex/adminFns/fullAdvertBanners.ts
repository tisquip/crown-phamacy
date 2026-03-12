import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";

const MAX_FULL_BANNERS = 10;

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * List all full-width advert banners ordered by their `order` field.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("fullAdvertBanner"),
      _creationTime: v.number(),
      storageId: v.optional(v.id("_storage")),
      cdnImageUrl: v.optional(v.string()),
      cdnImageKey: v.optional(v.string()),
      link: v.optional(v.string()),
      order: v.number(),
      lastModifiedBy: v.optional(v.id("users")),
      lastModifiedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("fullAdvertBanner")
      .withIndex("by_order")
      .collect();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Add a new full-width advert banner.
 */
export const add = mutation({
  args: {
    storageId: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  returns: v.union(v.id("fullAdvertBanner"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("fullAdvertBanner")
      .withIndex("by_order")
      .collect();

    if (existing.length >= MAX_FULL_BANNERS) {
      throw new Error(
        `Maximum of ${MAX_FULL_BANNERS} full-width advert banners allowed.`,
      );
    }

    const maxOrder = existing.reduce((max, b) => Math.max(max, b.order), -1);

    return await ctx.db.insert("fullAdvertBanner", {
      storageId: args.storageId,
      cdnImageUrl: args.cdnImageUrl,
      cdnImageKey: args.cdnImageKey,
      link: args.link,
      order: maxOrder + 1,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
  },
});

/**
 * Update an existing full-width advert banner's image and/or link.
 */
export const update = mutation({
  args: {
    id: v.id("fullAdvertBanner"),
    storageId: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    link: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db.get(args.id);
    if (existing?.cdnImageKey && existing.cdnImageKey !== args.cdnImageKey) {
      await ctx.scheduler.runAfter(0, api.cdn.deleteFile, {
        key: existing.cdnImageKey,
      });
    }

    const { id, storageId, cdnImageUrl, cdnImageKey, link } = args;
    const patch: Record<string, unknown> = {
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    };
    if (storageId !== undefined) patch.storageId = storageId;
    if (cdnImageUrl !== undefined) patch.cdnImageUrl = cdnImageUrl;
    if (cdnImageKey !== undefined) patch.cdnImageKey = cdnImageKey;
    if (link !== undefined) patch.link = link;

    await ctx.db.patch(id, patch);
    return null;
  },
});

/**
 * Remove a full-width advert banner.
 */
export const remove = mutation({
  args: { id: v.id("fullAdvertBanner") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

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

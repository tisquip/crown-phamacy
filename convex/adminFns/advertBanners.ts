import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";

const MAX_BANNERS = 4;

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * List all advert banners ordered by their `order` field.
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("advertBanner"),
      _creationTime: v.number(),
      storageId: v.optional(v.id("_storage")),
      cdnImageUrl: v.optional(v.string()),
      cdnImageKey: v.optional(v.string()),
      link: v.optional(v.string()),
      order: v.number(),
      isCarousel: v.optional(v.boolean()),
      carouselImages: v.optional(
        v.array(v.object({ cdnImageUrl: v.string(), cdnImageKey: v.string() })),
      ),
      lastModifiedBy: v.optional(v.id("users")),
      lastModifiedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    return await ctx.db.query("advertBanner").withIndex("by_order").collect();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Add a new advert banner. Maximum of 4 banners allowed.
 */
export const add = mutation({
  args: {
    storageId: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    link: v.optional(v.string()),
    isCarousel: v.optional(v.boolean()),
    carouselImages: v.optional(
      v.array(v.object({ cdnImageUrl: v.string(), cdnImageKey: v.string() })),
    ),
  },
  returns: v.union(v.id("advertBanner"), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("advertBanner")
      .withIndex("by_order")
      .collect();

    if (existing.length >= MAX_BANNERS) {
      throw new Error(`Maximum of ${MAX_BANNERS} advert banners allowed.`);
    }

    const maxOrder = existing.reduce((max, b) => Math.max(max, b.order), -1);

    return await ctx.db.insert("advertBanner", {
      storageId: args.storageId,
      cdnImageUrl: args.cdnImageUrl,
      cdnImageKey: args.cdnImageKey,
      link: args.link,
      order: maxOrder + 1,
      isCarousel: args.isCarousel,
      carouselImages: args.carouselImages,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
  },
});

/**
 * Update an existing advert banner's image and/or link.
 */
export const update = mutation({
  args: {
    id: v.id("advertBanner"),
    storageId: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
    link: v.optional(v.string()),
    isCarousel: v.optional(v.boolean()),
    carouselImages: v.optional(
      v.array(v.object({ cdnImageUrl: v.string(), cdnImageKey: v.string() })),
    ),
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

    const {
      id,
      storageId,
      cdnImageUrl,
      cdnImageKey,
      link,
      isCarousel,
      carouselImages,
    } = args;
    const patch: Record<string, unknown> = {
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    };
    if (storageId !== undefined) patch.storageId = storageId;
    if (cdnImageUrl !== undefined) patch.cdnImageUrl = cdnImageUrl;
    if (cdnImageKey !== undefined) patch.cdnImageKey = cdnImageKey;
    if (link !== undefined) patch.link = link;
    if (isCarousel !== undefined) patch.isCarousel = isCarousel;
    if (carouselImages !== undefined) patch.carouselImages = carouselImages;

    await ctx.db.patch(id, patch);
    return null;
  },
});

/**
 * Remove an advert banner.
 */
export const remove = mutation({
  args: { id: v.id("advertBanner") },
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

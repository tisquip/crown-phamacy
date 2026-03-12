import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * List all full-width advert banners for the homepage, ordered by `order`.
 */
export const listActive = query({
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

import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * List all advert banners for the homepage, ordered by the `order` field.
 */
export const listActive = query({
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

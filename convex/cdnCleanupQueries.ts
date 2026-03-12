import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Collect every CDN key referenced by any entity in the database.
 * This runs in the Convex runtime (not Node.js) so it can use ctx.db.
 */
export const getAllReferencedCdnKeys = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const keys: Set<string> = new Set();

    // productCategory
    const categories = await ctx.db.query("productCategory").collect();
    for (const cat of categories) {
      if (cat.cdnImageKey) keys.add(cat.cdnImageKey);
    }

    // products (cdnImages is an array of {url, key})
    const products = await ctx.db.query("products").collect();
    for (const prod of products) {
      if (prod.cdnImages) {
        for (const img of prod.cdnImages) {
          keys.add(img.key);
        }
      }
    }

    // heroSlide
    const heroSlides = await ctx.db.query("heroSlide").collect();
    for (const slide of heroSlides) {
      if (slide.cdnImageKey) keys.add(slide.cdnImageKey);
    }

    // homepageSection
    const sections = await ctx.db.query("homepageSection").collect();
    for (const section of sections) {
      if (section.cdnImageKey) keys.add(section.cdnImageKey);
    }

    // advertBanner
    const banners = await ctx.db.query("advertBanner").collect();
    for (const banner of banners) {
      if (banner.cdnImageKey) keys.add(banner.cdnImageKey);
    }

    // blogPost
    const posts = await ctx.db.query("blogPost").collect();
    for (const post of posts) {
      if (post.cdnImageKey) keys.add(post.cdnImageKey);
    }

    return Array.from(keys);
  },
});

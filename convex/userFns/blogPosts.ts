import { query } from "../_generated/server";
import { v } from "convex/values";

const publishedPostValidator = v.object({
  _id: v.id("blogPost"),
  _creationTime: v.number(),
  title: v.string(),
  slug: v.string(),
  excerpt: v.optional(v.string()),
  contentAsMarkdown: v.string(),
  authorId: v.id("users"),
  publishedAt: v.optional(v.number()),
  isPublished: v.boolean(),
  storageIdImage: v.optional(v.id("_storage")),
  cdnImageUrl: v.optional(v.string()),
  cdnImageKey: v.optional(v.string()),
  authorName: v.optional(v.string()),
});

/** List published blog posts (newest first) for public consumption. */
export const listPublished = query({
  args: {},
  returns: v.array(publishedPostValidator),
  handler: async (ctx) => {
    const posts = await ctx.db
      .query("blogPost")
      .withIndex("by_isDeleted_and_isPublished", (q) =>
        q.eq("isDeleted", undefined).eq("isPublished", true),
      )
      .order("desc")
      .collect();

    // Also get posts where isDeleted is false
    const posts2 = await ctx.db
      .query("blogPost")
      .withIndex("by_isDeleted_and_isPublished", (q) =>
        q.eq("isDeleted", false).eq("isPublished", true),
      )
      .order("desc")
      .collect();

    // Merge and deduplicate
    const allPostsMap = new Map<string, (typeof posts)[0]>();
    for (const p of [...posts, ...posts2]) {
      allPostsMap.set(p._id, p);
    }
    const allPosts = Array.from(allPostsMap.values()).sort(
      (a, b) =>
        (b.publishedAt ?? b._creationTime) - (a.publishedAt ?? a._creationTime),
    );

    const result = [];
    for (const post of allPosts) {
      let authorName: string | undefined;
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", post.authorId))
        .unique();
      if (profile?.name) {
        authorName = profile.name;
      }
      result.push({
        _id: post._id,
        _creationTime: post._creationTime,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        contentAsMarkdown: post.contentAsMarkdown,
        authorId: post.authorId,
        publishedAt: post.publishedAt,
        isPublished: post.isPublished,
        storageIdImage: post.storageIdImage,
        cdnImageUrl: post.cdnImageUrl,
        cdnImageKey: post.cdnImageKey,
        authorName,
      });
    }
    return result;
  },
});

/** Get a single published blog post by slug for public view. */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(publishedPostValidator, v.null()),
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPost")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!post) return null;
    if (post.isDeleted) return null;
    if (!post.isPublished) return null;

    let authorName: string | undefined;
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", post.authorId))
      .unique();
    if (profile?.name) {
      authorName = profile.name;
    }

    return {
      _id: post._id,
      _creationTime: post._creationTime,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      contentAsMarkdown: post.contentAsMarkdown,
      authorId: post.authorId,
      publishedAt: post.publishedAt,
      isPublished: post.isPublished,
      storageIdImage: post.storageIdImage,
      cdnImageUrl: post.cdnImageUrl,
      cdnImageKey: post.cdnImageKey,
      authorName,
    };
  },
});

/** Get the latest N published blog posts (for homepage highlight). */
export const getLatest = query({
  args: { limit: v.number() },
  returns: v.array(publishedPostValidator),
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("blogPost")
      .withIndex("by_isDeleted_and_isPublished", (q) =>
        q.eq("isDeleted", undefined).eq("isPublished", true),
      )
      .order("desc")
      .take(args.limit * 2); // fetch extra to merge

    const posts2 = await ctx.db
      .query("blogPost")
      .withIndex("by_isDeleted_and_isPublished", (q) =>
        q.eq("isDeleted", false).eq("isPublished", true),
      )
      .order("desc")
      .take(args.limit * 2);

    const allPostsMap = new Map<string, (typeof posts)[0]>();
    for (const p of [...posts, ...posts2]) {
      allPostsMap.set(p._id, p);
    }
    const allPosts = Array.from(allPostsMap.values())
      .sort(
        (a, b) =>
          (b.publishedAt ?? b._creationTime) -
          (a.publishedAt ?? a._creationTime),
      )
      .slice(0, args.limit);

    const result = [];
    for (const post of allPosts) {
      let authorName: string | undefined;
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", post.authorId))
        .unique();
      if (profile?.name) {
        authorName = profile.name;
      }
      result.push({
        _id: post._id,
        _creationTime: post._creationTime,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        contentAsMarkdown: post.contentAsMarkdown,
        authorId: post.authorId,
        publishedAt: post.publishedAt,
        isPublished: post.isPublished,
        storageIdImage: post.storageIdImage,
        cdnImageUrl: post.cdnImageUrl,
        cdnImageKey: post.cdnImageKey,
        authorName,
      });
    }
    return result;
  },
});

import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "../_generated/api";

/** List all blog posts for admin (including unpublished/deleted), newest first. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
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
      isDeleted: v.optional(v.boolean()),
      deletedAt: v.optional(v.number()),
      deletedBy: v.optional(v.id("users")),
      lastModifiedBy: v.optional(v.id("users")),
      lastModifiedAt: v.optional(v.number()),
      authorName: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const posts = await ctx.db.query("blogPost").order("desc").collect();

    const result = [];
    for (const post of posts) {
      // Resolve author name
      let authorName: string | undefined;
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", post.authorId))
        .unique();
      if (profile?.name) {
        authorName = profile.name;
      }
      result.push({ ...post, authorName });
    }
    return result;
  },
});

/** Get a single blog post by ID (admin). */
export const getById = query({
  args: { id: v.id("blogPost") },
  returns: v.union(
    v.object({
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
      isDeleted: v.optional(v.boolean()),
      deletedAt: v.optional(v.number()),
      deletedBy: v.optional(v.id("users")),
      lastModifiedBy: v.optional(v.id("users")),
      lastModifiedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Create a new blog post. */
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    contentAsMarkdown: v.string(),
    isPublished: v.boolean(),
    storageIdImage: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
  },
  returns: v.id("blogPost"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("blogPost", {
      title: args.title,
      slug: args.slug,
      excerpt: args.excerpt,
      contentAsMarkdown: args.contentAsMarkdown,
      authorId: userId,
      isPublished: args.isPublished,
      publishedAt: args.isPublished ? Date.now() : undefined,
      storageIdImage: args.storageIdImage,
      cdnImageUrl: args.cdnImageUrl,
      cdnImageKey: args.cdnImageKey,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
  },
});

/** Update an existing blog post. */
export const update = mutation({
  args: {
    id: v.id("blogPost"),
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    contentAsMarkdown: v.string(),
    isPublished: v.boolean(),
    storageIdImage: v.optional(v.id("_storage")),
    cdnImageUrl: v.optional(v.string()),
    cdnImageKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Blog post not found");

    // Delete old CDN image if it changed
    if (existing.cdnImageKey && existing.cdnImageKey !== args.cdnImageKey) {
      await ctx.scheduler.runAfter(0, api.cdn.deleteFile, {
        key: existing.cdnImageKey,
      });
    }

    const { id, ...fields } = args;
    await ctx.db.patch(id, {
      ...fields,
      // Set publishedAt when first published
      publishedAt:
        args.isPublished && !existing.publishedAt
          ? Date.now()
          : existing.publishedAt,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

/** Soft-delete a blog post. */
export const remove = mutation({
  args: { id: v.id("blogPost") },
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

    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
      deletedBy: userId,
    });
    return null;
  },
});

/** Restore a soft-deleted blog post. */
export const restore = mutation({
  args: { id: v.id("blogPost") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.id, {
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

import { internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Generate a short-lived upload URL that the client can POST a file to.
 * Returns the URL string which can then be used to upload a file directly
 * to Convex storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Returns true if the given storage ID belongs to an uploadedPrescription
 * record. Used by the /getImage HTTP endpoint to block prescription images.
 */
export const isPrescriptionImage = internalQuery({
  args: { storageId: v.id("_storage") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const prescription = await ctx.db
      .query("uploadedPrescription")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    return prescription !== null;
  },
});

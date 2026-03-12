import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getLoggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    const userProfile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();
    return { user, userProfile };
  },
});

export const addUserProfileForLoggedInUser = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const existingProfile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();
    if (existingProfile) {
      return existingProfile;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const adminUser = await ctx.db
      .query("userProfile")
      .withIndex("adminIndex", (q) => q.eq("isAdmin", true))
      .first();
    const isAdmin = !adminUser;

    const profileId = await ctx.db.insert("userProfile", {
      userId,
      name: user.name,
      isAdmin,
    });

    const profile = await ctx.db.get(profileId);

    return profile;
  },
});

export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    addresses: v.optional(v.array(v.string())),
    preferredBranch: v.optional(v.id("branch")),
    selectedCity: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("User profile not found");

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.phoneNumber !== undefined) updates.phoneNumber = args.phoneNumber;
    if (args.addresses !== undefined) updates.addresses = args.addresses;
    if (args.selectedCity !== undefined)
      updates.selectedCity = args.selectedCity;

    // When setting preferredBranch, also populate selectedCity from the branch
    if (args.preferredBranch !== undefined) {
      updates.preferredBranch = args.preferredBranch;
      const branch = await ctx.db.get(args.preferredBranch);
      if (branch) {
        updates.selectedCity = branch.city;
      }
    }

    if (Object.keys(updates).length > 0) {
      updates.lastModifiedBy = userId;
      updates.lastModifiedAt = Date.now();
      await ctx.db.patch(profile._id, updates);
    }

    return null;
  },
});

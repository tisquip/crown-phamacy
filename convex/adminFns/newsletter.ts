import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("newsletterSubscription"),
      _creationTime: v.number(),
      email: v.string(),
    }),
  ),
  handler: async (ctx, _args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile?.isAdmin) throw new Error("Forbidden");
    return await ctx.db.query("newsletterSubscription").order("desc").collect();
  },
});

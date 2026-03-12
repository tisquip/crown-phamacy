import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const subscribe = mutation({
  args: { email: v.string() },
  returns: v.union(v.literal("subscribed"), v.literal("already_subscribed")),
  handler: async (ctx, args) => {
    const normalised = args.email.trim().toLowerCase();
    const existing = await ctx.db
      .query("newsletterSubscription")
      .withIndex("by_email", (q) => q.eq("email", normalised))
      .unique();
    if (existing) return "already_subscribed";
    await ctx.db.insert("newsletterSubscription", { email: normalised });
    return "subscribed";
  },
});

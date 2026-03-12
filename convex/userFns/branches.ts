import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

const branchValidator = v.object({
  _id: v.id("branch"),
  _creationTime: v.number(),
  name: v.string(),
  address: v.string(),
  city: v.string(),
  cell: v.string(),
  landline: v.string(),
  email: v.string(),
  comingSoon: v.boolean(),
});

export const list = query({
  args: {},
  returns: v.array(branchValidator),
  handler: async (ctx) => {
    return await ctx.db.query("branch").collect();
  },
});

/**
 * Seed the branch table with static data if it is empty.
 * Safe to call multiple times – inserts only when the table has 0 rows.
 */
export const seedIfEmpty = mutation({
  args: {
    branches: v.array(
      v.object({
        name: v.string(),
        address: v.string(),
        city: v.string(),
        cell: v.string(),
        landline: v.string(),
        email: v.string(),
        comingSoon: v.boolean(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("branch").first();
    if (existing) return null;

    for (const branch of args.branches) {
      await ctx.db.insert("branch", branch);
    }
    return null;
  },
});

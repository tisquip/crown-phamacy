import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("branch").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    address: v.string(),
    city: v.string(),
    cell: v.string(),
    landline: v.string(),
    email: v.string(),
    comingSoon: v.boolean(),
  },
  returns: v.id("branch"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("branch", {
      name: args.name,
      address: args.address,
      city: args.city,
      cell: args.cell,
      landline: args.landline,
      email: args.email,
      comingSoon: args.comingSoon,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("branch"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    cell: v.string(),
    landline: v.string(),
    email: v.string(),
    comingSoon: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Branch not found");

    await ctx.db.patch(args.id, {
      name: args.name,
      address: args.address,
      city: args.city,
      cell: args.cell,
      landline: args.landline,
      email: args.email,
      comingSoon: args.comingSoon,
    });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("branch") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Branch not found");

    await ctx.db.delete(args.id);
    return null;
  },
});

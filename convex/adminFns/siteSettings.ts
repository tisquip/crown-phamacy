import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { GenericMutationCtx } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";

const SETTINGS_KEY = "global";

/** Default delivery settings (used when no document exists yet). */
const DEFAULTS = {
  deliveryPriceInUSDCents: 500, // $5.00
  freeDeliveryThresholdInUSDCents: 5000, // $50.00
};

async function requireAdmin(
  ctx: GenericMutationCtx<DataModel>,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfile")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();
  if (!profile?.isAdmin) throw new Error("Admin access required");
  return userId;
}

/**
 * Get the current delivery settings.
 */
export const getDeliverySettings = query({
  args: {},
  returns: v.object({
    deliveryPriceInUSDCents: v.number(),
    freeDeliveryThresholdInUSDCents: v.number(),
  }),
  handler: async (ctx) => {
    const doc = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .unique();
    if (!doc) {
      return DEFAULTS;
    }
    return {
      deliveryPriceInUSDCents: doc.deliveryPriceInUSDCents,
      freeDeliveryThresholdInUSDCents: doc.freeDeliveryThresholdInUSDCents,
    };
  },
});

/**
 * Update the delivery settings (admin only).
 */
export const updateDeliverySettings = mutation({
  args: {
    deliveryPriceInUSDCents: v.number(),
    freeDeliveryThresholdInUSDCents: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminUserId = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        deliveryPriceInUSDCents: args.deliveryPriceInUSDCents,
        freeDeliveryThresholdInUSDCents: args.freeDeliveryThresholdInUSDCents,
        lastModifiedBy: adminUserId,
        lastModifiedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("siteSettings", {
        key: SETTINGS_KEY,
        deliveryPriceInUSDCents: args.deliveryPriceInUSDCents,
        freeDeliveryThresholdInUSDCents: args.freeDeliveryThresholdInUSDCents,
        lastModifiedBy: adminUserId,
        lastModifiedAt: Date.now(),
      });
    }

    return null;
  },
});

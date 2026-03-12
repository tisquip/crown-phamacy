import { query } from "../_generated/server";
import { v } from "convex/values";

const SETTINGS_KEY = "global";

const DEFAULTS = {
  deliveryPriceInUSDCents: 500, // $5.00
  freeDeliveryThresholdInUSDCents: 5000, // $50.00
};

/**
 * Public query: get delivery settings for the storefront.
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

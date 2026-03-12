import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

/**
 * Internal query: fetch all data needed to compose an order notification email.
 * Called from the notifyNewOrder internalAction.
 */
export const getOrderDataForNotification = internalQuery({
  args: { orderId: v.id("order") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", order.clientId))
      .unique();

    const items: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPriceInUSDCents: number;
      brandName: string | null;
    }> = JSON.parse(order.productsAsJsonOnDateOfPurchase);

    return {
      orderId: args.orderId as string,
      clientName: profile?.name ?? null,
      clientPhone: profile?.phoneNumber ?? order.phoneNumber ?? null,
      items,
      subtotalInUSDCents: order.subtotalInUSDCents,
      deliveryFeeInUSDCents: order.deliveryFeeInUSDCents,
      totalInUSDCents: order.totalInUSDCents,
      paymentMethod: order.paymentMethod ?? "cash",
      deliveryMethod: order.deliveryMethod ?? "delivery",
      address: order.address ?? null,
      notes: order.notes ?? null,
      createdAt: order._creationTime,
    };
  },
});

/**
 * Internal query: fetch all data needed to compose a prescription upload
 * notification email. Called from the notifyNewPrescription internalAction.
 */
export const getPrescriptionDataForNotification = internalQuery({
  args: { prescriptionId: v.id("uploadedPrescription") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) return null;

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", prescription.clientId))
      .unique();

    return {
      prescriptionId: args.prescriptionId as string,
      clientName: profile?.name ?? null,
      clientPhone: profile?.phoneNumber ?? null,
      fileName: prescription.fileName ?? null,
      notes: prescription.notes ?? null,
      createdAt: prescription._creationTime,
    };
  },
});

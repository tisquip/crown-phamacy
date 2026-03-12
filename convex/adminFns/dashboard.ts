import { query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

/**
 * Dashboard summary for admin — returns counts of orders by status,
 * prescriptions needing attention, and recent items for both.
 */
export const getDashboardSummary = query({
  args: {},
  returns: v.object({
    // Order counts by actionable status
    orderCounts: v.object({
      pending: v.number(),
      confirmed: v.number(),
      processing: v.number(),
      dispatched: v.number(),
    }),
    // Prescription counts by actionable status
    prescriptionCounts: v.object({
      Uploaded: v.number(),
      QuotationSent: v.number(),
    }),
    // Recent orders needing attention (pending, confirmed, processing)
    recentOrdersNeedingAttention: v.array(
      v.object({
        _id: v.id("order"),
        _creationTime: v.number(),
        status: v.string(),
        totalInUSDCents: v.number(),
        clientName: v.string(),
        itemCount: v.number(),
      }),
    ),
    // Recent prescriptions needing attention (Uploaded, Quotation Sent)
    recentPrescriptionsNeedingAttention: v.array(
      v.object({
        _id: v.id("uploadedPrescription"),
        _creationTime: v.number(),
        status: v.string(),
        clientName: v.string(),
        fileName: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx) => {
    // ── Order counts ──────────────────────────────────────────────────────
    const statuses = [
      "pending",
      "confirmed",
      "processing",
      "dispatched",
    ] as const;

    const orderCounts: Record<string, number> = {};
    for (const status of statuses) {
      const orders = await ctx.db
        .query("order")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      orderCounts[status] = orders.length;
    }

    // ── Orders needing attention (pending, confirmed, processing) ─────────
    const attentionStatuses = ["pending", "confirmed", "processing"] as const;
    const ordersNeedingAttention = [];
    for (const status of attentionStatuses) {
      const orders = await ctx.db
        .query("order")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(20);
      ordersNeedingAttention.push(...orders);
    }
    // Sort by creation time desc and take top 10
    ordersNeedingAttention.sort((a, b) => b._creationTime - a._creationTime);
    const topOrders = ordersNeedingAttention.slice(0, 10);

    // Resolve client names for orders
    const orderClientIds = [...new Set(topOrders.map((o) => o.clientId))];
    const orderClientNames: Record<string, string> = {};
    for (const clientId of orderClientIds) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", clientId as Id<"users">))
        .unique();
      orderClientNames[clientId] = profile?.name ?? "Unknown";
    }

    const recentOrdersNeedingAttention = topOrders.map((o) => ({
      _id: o._id,
      _creationTime: o._creationTime,
      status: o.status,
      totalInUSDCents: o.totalInUSDCents,
      clientName: orderClientNames[o.clientId] ?? "Unknown",
      itemCount: o.productIds?.length ?? 0,
    }));

    // ── Prescription counts ───────────────────────────────────────────────
    const prescriptionStatuses = ["Uploaded", "Quotation Sent"] as const;

    const prescriptionCounts: Record<string, number> = {};
    for (const status of prescriptionStatuses) {
      const prescriptions = await ctx.db
        .query("uploadedPrescription")
        .withIndex("by_status", (q) => q.eq("status", status))
        .collect();
      prescriptionCounts[
        status === "Quotation Sent" ? "QuotationSent" : status
      ] = prescriptions.length;
    }

    // ── Prescriptions needing attention (Uploaded, Quotation Sent) ────────
    const presAttentionStatuses = ["Uploaded", "Quotation Sent"] as const;
    const prescriptionsNeedingAttention = [];
    for (const status of presAttentionStatuses) {
      const prescriptions = await ctx.db
        .query("uploadedPrescription")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(20);
      prescriptionsNeedingAttention.push(...prescriptions);
    }
    prescriptionsNeedingAttention.sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    const topPrescriptions = prescriptionsNeedingAttention.slice(0, 10);

    // Resolve client names for prescriptions
    const presClientIds = [...new Set(topPrescriptions.map((p) => p.clientId))];
    const presClientNames: Record<string, string> = {};
    for (const clientId of presClientIds) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", clientId as Id<"users">))
        .unique();
      presClientNames[clientId] = profile?.name ?? "Unknown";
    }

    const recentPrescriptionsNeedingAttention = topPrescriptions.map((p) => ({
      _id: p._id,
      _creationTime: p._creationTime,
      status: p.status,
      clientName: presClientNames[p.clientId] ?? "Unknown",
      fileName: p.fileName,
    }));

    return {
      orderCounts: orderCounts as {
        pending: number;
        confirmed: number;
        processing: number;
        dispatched: number;
      },
      prescriptionCounts: prescriptionCounts as {
        Uploaded: number;
        QuotationSent: number;
      },
      recentOrdersNeedingAttention,
      recentPrescriptionsNeedingAttention,
    };
  },
});

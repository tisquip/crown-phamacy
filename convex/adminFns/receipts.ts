import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, GenericMutationCtx } from "convex/server";
import { DataModel, Id } from "../_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdmin(
  ctx: GenericMutationCtx<DataModel>,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("userProfile")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();
  if (!profile?.isAdmin) throw new Error("Not authorized");
  return userId;
}

/**
 * Paginated list of all orders, newest first.
 * Enriches each row with the client's name.
 */
export const listReceipts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("order")
      .order("desc")
      .paginate(args.paginationOpts);

    // Collect unique client IDs for a single-pass name look-up
    const uniqueClientIds = [...new Set(page.page.map((r) => r.clientId))];
    const clientNameMap: Record<string, string> = {};
    for (const clientId of uniqueClientIds) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", clientId as Id<"users">))
        .unique();
      clientNameMap[clientId] = profile?.name ?? "Unknown";
    }

    return {
      ...page,
      page: page.page.map((r) => ({
        ...r,
        clientName: clientNameMap[r.clientId] ?? "Unknown",
      })),
    };
  },
});

/**
 * Full details of a single order:
 * - order document
 * - client profile
 * - admin who created the order (if any)
 * - linked prescriptions with signed storage URLs
 */
export const getReceiptById = query({
  args: { id: v.id("order") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.id);
    if (!order) return null;

    // Client profile (enriched with email + phone from profile)
    const rawClientProfile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", order.clientId))
      .unique();
    let clientProfile = null;
    if (rawClientProfile) {
      const authUser = await ctx.db.get(order.clientId);
      clientProfile = {
        ...rawClientProfile,
        email: (authUser as Record<string, unknown> | null)?.email ?? null,
      };
    }

    // Admin who created the order
    let adminProfile = null;
    if (order.adminWhoCreatedOrder) {
      adminProfile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) =>
          q.eq("userId", order.adminWhoCreatedOrder!),
        )
        .unique();
    }

    // Linked prescriptions with storage URLs
    const uploadedPrescriptionIds = order.uploadedPrescriptionIds ?? [];
    const prescriptions = await Promise.all(
      uploadedPrescriptionIds.map(async (presId) => {
        const pres = await ctx.db.get(presId);
        if (!pres) return null;
        const storageUrl = await ctx.storage.getUrl(pres.storageId);
        return { ...pres, storageUrl };
      }),
    );

    // Branch details (if this is a collection order)
    let branchDetails = null;
    if (order.branchCollection) {
      branchDetails = await ctx.db.get(order.branchCollection);
    }

    return {
      receipt: order,
      clientProfile,
      adminProfile,
      prescriptions: prescriptions.filter(Boolean),
      branchDetails,
    };
  },
});

/**
 * Update the status of an order (admin only).
 */
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("order"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("processing"),
      v.literal("dispatched"),
      v.literal("delivered"),
      v.literal("collected"),
      v.literal("cancelled"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminUserId = await requireAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");

    await ctx.db.patch(args.orderId, {
      status: args.status,
      lastModifiedBy: adminUserId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

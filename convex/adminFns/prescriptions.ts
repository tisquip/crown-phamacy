import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, GenericMutationCtx } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { DataModel, Id } from "../_generated/dataModel";

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

// ── Purchase helper (uses shared helper from ../helpers/purchaseHelper) ────────

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Paginated list of all prescriptions for the admin, newest first.
 * Optionally filter by status.
 */
export const listPrescriptions = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(
      v.union(
        v.literal("Uploaded"),
        v.literal("Quotation Sent"),
        v.literal("Purchased"),
        v.literal("Cancelled"),
      ),
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("uploadedPrescription")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
    }
    return await ctx.db
      .query("uploadedPrescription")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Get a single prescription with its client's profile name.
 */
export const getPrescriptionWithClient = query({
  args: { id: v.id("uploadedPrescription") },
  returns: v.union(
    v.object({
      prescription: v.any(),
      clientName: v.union(v.string(), v.null()),
      clientPhoneNumber: v.union(v.string(), v.null()),
      clientAddress: v.union(v.string(), v.null()),
      storageUrl: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const prescription = await ctx.db.get(args.id);
    if (!prescription) return null;

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", prescription.clientId))
      .unique();

    const storageUrl = prescription.storageId
      ? await ctx.storage.getUrl(prescription.storageId)
      : null;

    return {
      prescription,
      clientName: profile?.name ?? null,
      clientPhoneNumber: profile?.phoneNumber ?? null,
      clientAddress:
        profile?.addresses && profile.addresses.length > 0
          ? profile.addresses[0]
          : null,
      storageUrl,
    };
  },
});

/**
 * Lightweight client name look-up for rendering rows in the prescription list.
 */
export const getClientNamesForPrescriptions = query({
  args: { clientIds: v.array(v.id("users")) },
  returns: v.record(v.id("users"), v.string()),
  handler: async (ctx, args) => {
    const result: Record<Id<"users">, string> = {};
    for (const clientId of args.clientIds) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", clientId))
        .unique();
      result[clientId] = profile?.name ?? clientId;
    }
    return result;
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Update the status of a prescription. Use this for status transitions
 * like Cancelled. "Quotation Sent" is set automatically when a prescription
 * order is created, and "Purchased" when the user completes the purchase.
 */
export const updatePrescriptionStatus = mutation({
  args: {
    id: v.id("uploadedPrescription"),
    status: v.union(v.literal("Uploaded"), v.literal("Cancelled")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const adminUserId = await requireAdmin(ctx);

    const prescription = await ctx.db.get(args.id);
    if (!prescription) throw new Error("Prescription not found");
    if (prescription.status === "Purchased") {
      throw new Error("Cannot change status of a purchased prescription");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      lastModifiedBy: adminUserId,
      lastModifiedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Create a prescription order for a prescription.
 *
 * This creates a prescriptionOrder (valid for 24 hours) and sets the
 * prescription status to "Quotation Sent". The user can then choose to
 * purchase or cancel the prescription order.
 */
export const createPrescriptionOrder = mutation({
  args: {
    prescriptionId: v.id("uploadedPrescription"),
    productIds: v.array(v.id("products")),
    productsAsJson: v.string(),
    subtotalInUSDCents: v.number(),
    totalInUSDCents: v.number(),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  returns: v.id("prescriptionOrder"),
  handler: async (ctx, args) => {
    const adminUserId = await requireAdmin(ctx);

    const prescription = await ctx.db.get(args.prescriptionId);
    if (!prescription) throw new Error("Prescription not found");
    if (prescription.status === "Purchased") {
      throw new Error(
        "A purchase has already been created for this prescription",
      );
    }

    // Check no existing pending prescription order for this prescription
    const existingOrders = await ctx.db
      .query("prescriptionOrder")
      .withIndex("by_prescriptionId", (q) =>
        q.eq("prescriptionId", args.prescriptionId),
      )
      .collect();
    const activePO = existingOrders.find((po) => po.status === "pending");
    if (activePO) {
      throw new Error(
        "A pending prescription order already exists for this prescription",
      );
    }

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const prescriptionOrderId = await ctx.db.insert("prescriptionOrder", {
      clientId: prescription.clientId,
      prescriptionId: args.prescriptionId,
      createdByAdmin: adminUserId,
      productsAsJson: args.productsAsJson,
      productIds: args.productIds,
      subtotalInUSDCents: args.subtotalInUSDCents,
      totalInUSDCents: args.totalInUSDCents,
      status: "pending",
      expiresAt,
      phoneNumber: args.phoneNumber,
      address: args.address,
      lastModifiedBy: adminUserId,
      lastModifiedAt: now,
    });

    // Mark prescription as "Quotation Sent"
    await ctx.db.patch(args.prescriptionId, {
      status: "Quotation Sent",
      lastModifiedBy: adminUserId,
      lastModifiedAt: now,
    });

    return prescriptionOrderId;
  },
});

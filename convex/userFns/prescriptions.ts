import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Shared validator shape for an uploadedPrescription document. */
const prescriptionDoc = v.object({
  _id: v.id("uploadedPrescription"),
  _creationTime: v.number(),
  storageId: v.id("_storage"),
  clientId: v.id("users"),
  status: v.union(
    v.literal("Uploaded"),
    v.literal("Quotation Sent"),
    v.literal("Purchased"),
    v.literal("Cancelled"),
  ),
  notes: v.optional(v.string()),
  fileName: v.optional(v.string()),
  fileType: v.optional(v.string()),
  lastModifiedBy: v.optional(v.id("users")),
  lastModifiedAt: v.optional(v.number()),
});

/**
 * Submit a new prescription upload. The file must already have been uploaded
 * to Convex storage (use `fileStorage.generateUploadUrl` first).
 */
export const submitPrescription = mutation({
  args: {
    storageId: v.id("_storage"),
    notes: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileType: v.string(),
  },
  returns: v.id("uploadedPrescription"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const id = await ctx.db.insert("uploadedPrescription", {
      storageId: args.storageId,
      clientId: userId,
      status: "Uploaded",
      notes: args.notes,
      fileName: args.fileName,
      fileType: args.fileType,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    });
    return id;
  },
});

/**
 * Returns all prescriptions for the authenticated user, newest first.
 */
export const getMyPrescriptions = query({
  args: {},
  returns: v.array(prescriptionDoc),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const prescriptions = await ctx.db
      .query("uploadedPrescription")
      .withIndex("by_clientId", (q) => q.eq("clientId", userId))
      .order("desc")
      .collect();

    return prescriptions;
  },
});

/**
 * Returns a single prescription by ID, only if the caller owns it.
 */
export const getPrescriptionById = query({
  args: { id: v.id("uploadedPrescription") },
  returns: v.union(prescriptionDoc, v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prescription = await ctx.db.get(args.id);
    if (!prescription) return null;
    if (prescription.clientId !== userId) return null;

    return prescription;
  },
});

export const getPrescriptionUrl = query({
  args: { id: v.id("uploadedPrescription") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prescription = await ctx.db.get(args.id);
    if (!prescription) return null;

    if (prescription.clientId !== userId) {
      const userProfile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();

      if (!userProfile || !userProfile.isAdmin) {
        return null;
      }
    }

    const url = await ctx.storage.getUrl(prescription.storageId); // Check access to the file

    return url;
  },
});

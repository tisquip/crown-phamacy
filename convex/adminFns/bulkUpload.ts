import { internalMutation, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Validators ──────────────────────────────────────────────────────────

const productAddedValidator = v.object({
  stockCode: v.string(),
  name: v.string(),
});

const productUpdatedValidator = v.object({
  stockCode: v.string(),
  name: v.string(),
  changes: v.array(v.string()),
});

const productUntouchedValidator = v.object({
  stockCode: v.string(),
  name: v.string(),
});

// ── Public query: get the latest upload status ──────────────────────────
export const getLatestUpload = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("productBulkUpload"),
      _creationTime: v.number(),
      storageId: v.id("_storage"),
      fileName: v.optional(v.string()),
      status: v.union(
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      productsAdded: v.optional(v.array(productAddedValidator)),
      productsUpdated: v.optional(v.array(productUpdatedValidator)),
      productsUntouched: v.optional(v.array(productUntouchedValidator)),
      errorMessage: v.optional(v.string()),
      uploadedBy: v.id("users"),
      uploadedAt: v.number(),
      completedAt: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const latest = await ctx.db
      .query("productBulkUpload")
      .order("desc")
      .first();

    return latest ?? null;
  },
});

// ── Public mutation: initiate upload ────────────────────────────────────
export const initiateUpload = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.optional(v.string()),
  },
  returns: v.id("productBulkUpload"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Delete old upload file from storage and record
    const previousUpload = await ctx.db
      .query("productBulkUpload")
      .order("desc")
      .first();

    if (previousUpload) {
      await ctx.storage.delete(previousUpload.storageId);
      await ctx.db.delete(previousUpload._id);
    }

    // Create new upload record
    const uploadId = await ctx.db.insert("productBulkUpload", {
      storageId: args.storageId,
      fileName: args.fileName,
      status: "processing",
      uploadedBy: userId,
      uploadedAt: Date.now(),
    });

    // Schedule the processing action
    await ctx.scheduler.runAfter(
      0,
      internal.adminFns.bulkUploadAction.processExcelFile,
      {
        uploadId,
        storageId: args.storageId,
      },
    );

    return uploadId;
  },
});

// ── Internal mutation: process a batch of products ──────────────────────
export const processProductBatch = internalMutation({
  args: {
    products: v.array(
      v.object({
        stockCode: v.string(),
        name: v.string(),
        description: v.string(),
        promotionPriceInUSDCents: v.optional(v.number()),
        bulkOfferPriceInUSDCents: v.optional(v.number()),
        bulkOfferQty: v.optional(v.number()),
        retailPriceInUSDCents: v.number(),
        barcode: v.optional(v.string()),
        isMedicine: v.boolean(),
        isPrescriptionControlled: v.boolean(),
        inStock: v.boolean(),
      }),
    ),
  },
  returns: v.object({
    added: v.array(productAddedValidator),
    updated: v.array(productUpdatedValidator),
    untouched: v.array(productUntouchedValidator),
  }),
  handler: async (ctx, args) => {
    const added: Array<{ stockCode: string; name: string }> = [];
    const updated: Array<{
      stockCode: string;
      name: string;
      changes: Array<string>;
    }> = [];
    const untouched: Array<{ stockCode: string; name: string }> = [];

    for (const product of args.products) {
      // Look up existing product by stockCode
      const existing = await ctx.db
        .query("products")
        .withIndex("by_stockCode", (q) => q.eq("stockCode", product.stockCode))
        .first();

      if (existing) {
        // Compare fields and build changes list
        // Note: name and description are intentionally NOT updated on existing products
        const changes: Array<string> = [];

        if (
          (existing.promotionPriceInUSDCents ?? undefined) !==
          product.promotionPriceInUSDCents
        ) {
          changes.push(
            `promotionPrice: ${formatCents(existing.promotionPriceInUSDCents)} → ${formatCents(product.promotionPriceInUSDCents)}`,
          );
        }
        if (
          (existing.bulkOfferPriceInUSDCents ?? undefined) !==
          product.bulkOfferPriceInUSDCents
        ) {
          changes.push(
            `bulkOfferPrice: ${formatCents(existing.bulkOfferPriceInUSDCents)} → ${formatCents(product.bulkOfferPriceInUSDCents)}`,
          );
        }
        if ((existing.bulkOfferQty ?? undefined) !== product.bulkOfferQty) {
          changes.push(
            `bulkOfferQty: ${existing.bulkOfferQty ?? "none"} → ${product.bulkOfferQty ?? "none"}`,
          );
        }
        if (existing.retailPriceInUSDCents !== product.retailPriceInUSDCents) {
          changes.push(
            `retailPrice: ${formatCents(existing.retailPriceInUSDCents)} → ${formatCents(product.retailPriceInUSDCents)}`,
          );
        }

        // For barcode: if Excel column is empty/undefined, clear the barcode
        const newBarcode = product.barcode ?? "";
        const existingBarcode = existing.barcode ?? "";
        if (existingBarcode !== newBarcode) {
          changes.push(`barcode: "${existingBarcode}" → "${newBarcode}"`);
        }

        if (existing.isMedicine !== product.isMedicine) {
          changes.push(
            `isMedicine: ${existing.isMedicine} → ${product.isMedicine}`,
          );
        }
        if (
          existing.isPrescriptionControlled !== product.isPrescriptionControlled
        ) {
          changes.push(
            `isPrescriptionControlled: ${existing.isPrescriptionControlled} → ${product.isPrescriptionControlled}`,
          );
        }
        if (existing.inStock !== product.inStock) {
          changes.push(`inStock: ${existing.inStock} → ${product.inStock}`);
        }

        if (changes.length > 0) {
          // Update product - preserve name, description, detailedDescription and other fields not in Excel
          await ctx.db.patch(existing._id, {
            promotionPriceInUSDCents: product.promotionPriceInUSDCents,
            bulkOfferPriceInUSDCents: product.bulkOfferPriceInUSDCents,
            bulkOfferQty: product.bulkOfferQty,
            retailPriceInUSDCents: product.retailPriceInUSDCents,
            barcode: newBarcode === "" ? undefined : newBarcode,
            isMedicine: product.isMedicine,
            isPrescriptionControlled: product.isPrescriptionControlled,
            inStock: product.inStock,
            lastModifiedAt: Date.now(),
          });
          updated.push({
            stockCode: product.stockCode,
            name: existing.name,
            changes,
          });
        } else {
          untouched.push({
            stockCode: product.stockCode,
            name: existing.name,
          });
        }
      } else {
        // Create new product
        await ctx.db.insert("products", {
          stockCode: product.stockCode,
          name: product.name,
          description: product.description,
          promotionPriceInUSDCents: product.promotionPriceInUSDCents,
          bulkOfferPriceInUSDCents: product.bulkOfferPriceInUSDCents,
          bulkOfferQty: product.bulkOfferQty,
          retailPriceInUSDCents: product.retailPriceInUSDCents,
          barcode:
            product.barcode && product.barcode !== ""
              ? product.barcode
              : undefined,
          isMedicine: product.isMedicine,
          isPrescriptionControlled: product.isPrescriptionControlled,
          inStock: product.inStock,
          lastModifiedAt: Date.now(),
        });
        added.push({ stockCode: product.stockCode, name: product.name });
      }
    }

    return { added, updated, untouched };
  },
});

// ── Internal mutation: update the upload record status ───────────────────
export const updateUploadStatus = internalMutation({
  args: {
    uploadId: v.id("productBulkUpload"),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    productsAdded: v.optional(v.array(productAddedValidator)),
    productsUpdated: v.optional(v.array(productUpdatedValidator)),
    productsUntouched: v.optional(v.array(productUntouchedValidator)),
    errorMessage: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { uploadId, ...fields } = args;
    await ctx.db.patch(uploadId, fields);
    return null;
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────

/** Format a cents value as a dollar string for change descriptions. */
function formatCents(cents: number | undefined | null): string {
  if (cents === undefined || cents === null) return "none";
  return `$${(cents / 100).toFixed(2)}`;
}

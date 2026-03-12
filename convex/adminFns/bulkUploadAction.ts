"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import * as XLSX from "xlsx";

// ── Raw row shape coming from the Excel file ────────────────────────────
interface ExcelProductRow {
  stockCode: string;
  name: string;
  description: string;
  promotionPriceInUSDCents: number | undefined;
  bulkOfferPriceInUSDCents: number | undefined;
  bulkOfferQty: number | undefined;
  retailPriceInUSDCents: number;
  barcode: string | undefined;
  isMedicine: boolean;
  isPrescriptionControlled: boolean;
  inStock: boolean;
}

// ── Internal action: read & parse the Excel file ────────────────────────
export const processExcelFile = internalAction({
  args: {
    uploadId: v.id("productBulkUpload"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // 1. Download the file from Convex storage
      const fileUrl = await ctx.storage.getUrl(args.storageId);
      if (!fileUrl) throw new Error("File not found in storage");

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      // 2. Parse with xlsx
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
        type: "array",
      });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("No sheet found in the Excel file");

      const sheet = workbook.Sheets[sheetName];
      // header: 1 gives us raw arrays; we'll manually map columns
      const rawRows: Array<Array<unknown>> = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
      });

      if (rawRows.length < 2) {
        throw new Error(
          "Excel file must have at least a header row and one data row",
        );
      }

      // Skip header row (index 0), parse data rows
      const products: Array<ExcelProductRow> = [];
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const stockCode = row[0];
        // Skip rows where stockCode is empty/null
        if (
          stockCode === null ||
          stockCode === undefined ||
          String(stockCode).trim() === ""
        )
          continue;

        products.push({
          stockCode: String(stockCode).trim(),
          name: row[1] != null ? String(row[1]).trim() : "",
          description: row[2] != null ? String(row[2]).trim() : "",
          promotionPriceInUSDCents:
            dollarsToCents(parseNumericCell(row[3])) ?? undefined,
          bulkOfferPriceInUSDCents:
            dollarsToCents(parseNumericCell(row[4])) ?? undefined,
          bulkOfferQty: parseNumericCell(row[5]) ?? undefined,
          retailPriceInUSDCents: dollarsToCents(parseNumericCell(row[6])) ?? 0,
          barcode:
            row[7] != null && String(row[7]).trim() !== ""
              ? String(row[7]).trim()
              : undefined,
          isMedicine: parseBooleanCell(row[8]),
          isPrescriptionControlled: parseBooleanCell(row[9]),
          inStock: parseBooleanCell(row[10]),
        });
      }

      // 3. Process products in batches of 50
      const BATCH_SIZE = 50;
      const allAdded: Array<{ stockCode: string; name: string }> = [];
      const allUpdated: Array<{
        stockCode: string;
        name: string;
        changes: Array<string>;
      }> = [];
      const allUntouched: Array<{ stockCode: string; name: string }> = [];

      for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        const result: {
          added: Array<{ stockCode: string; name: string }>;
          updated: Array<{
            stockCode: string;
            name: string;
            changes: Array<string>;
          }>;
          untouched: Array<{ stockCode: string; name: string }>;
        } = await ctx.runMutation(
          internal.adminFns.bulkUpload.processProductBatch,
          {
            products: batch,
          },
        );

        allAdded.push(...result.added);
        allUpdated.push(...result.updated);
        allUntouched.push(...result.untouched);
      }

      // 4. Update the upload record with results
      await ctx.runMutation(internal.adminFns.bulkUpload.updateUploadStatus, {
        uploadId: args.uploadId,
        status: "completed" as const,
        productsAdded: allAdded,
        productsUpdated: allUpdated,
        productsUntouched: allUntouched,
        completedAt: Date.now(),
      });
    } catch (error) {
      // Mark as failed
      await ctx.runMutation(internal.adminFns.bulkUpload.updateUploadStatus, {
        uploadId: args.uploadId,
        status: "failed" as const,
        errorMessage:
          error instanceof Error ? error.message : "Unknown error occurred",
        productsAdded: [],
        productsUpdated: [],
        productsUntouched: [],
        completedAt: Date.now(),
      });
    }

    return null;
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────

function parseNumericCell(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/** Convert a dollar amount to cents, rounding to avoid floating-point issues. */
function dollarsToCents(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 100);
}

function parseBooleanCell(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  const str = String(value).trim().toLowerCase();
  return str === "true" || str === "1" || str === "yes";
}

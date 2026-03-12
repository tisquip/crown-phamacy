import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import {
  paginationOptsValidator,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { DataModel, Id } from "../_generated/dataModel";
import { executePurchase } from "../helpers/purchaseHelper";

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

// ── Queries ───────────────────────────────────────────────────────────────────

// ── Helper: attach email + phone to a profile ────────────────────────────────

type QueryCtx = GenericQueryCtx<DataModel>;

async function enrichProfile(
  ctx: QueryCtx,
  profile: { userId: Id<"users">; [key: string]: unknown },
) {
  const authUser = await ctx.db.get(profile.userId);
  return {
    ...profile,
    email: (authUser as Record<string, unknown> | null)?.email ?? null,
    phoneNumber: (profile as Record<string, unknown>).phoneNumber ?? null,
  };
}

/**
 * Full-text search across userProfile names, emails, and phone numbers.
 * - Names are searched via the full-text search index (partial match).
 * - Emails are matched against the auth `users` table (partial, JS-side).
 * - Phone numbers are matched against order records (partial, JS-side).
 * Falls back to the 20 most-recent profiles when the query is empty.
 */
export const searchClients = query({
  args: { query: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const term = args.query.trim().toLowerCase();

    if (!term) {
      const profiles = await ctx.db.query("userProfile").order("desc").take(20);
      return await Promise.all(
        profiles.map((p) =>
          enrichProfile(
            ctx,
            p as { userId: Id<"users">; [key: string]: unknown },
          ),
        ),
      );
    }

    // 1. Name search via full-text index
    const nameProfiles = await ctx.db
      .query("userProfile")
      .withSearchIndex("search_name", (q) => q.search("name", args.query))
      .take(20);

    // 2. Email search: scan auth users table (JS-side partial match)
    const authUsers = await ctx.db.query("users").take(500);
    const emailMatchedUsers = authUsers.filter((u) =>
      ((u as Record<string, unknown>).email as string | undefined)
        ?.toLowerCase()
        .includes(term),
    );
    const emailProfiles: (typeof nameProfiles)[number][] = [];
    for (const u of emailMatchedUsers.slice(0, 10)) {
      const prof = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", u._id as Id<"users">))
        .unique();
      if (prof) emailProfiles.push(prof);
    }

    // 3. Phone search: scan order records (JS-side partial match)
    const recentOrders = await ctx.db.query("order").order("desc").take(500);
    const phoneMatchedOrders = recentOrders.filter((r) =>
      r.phoneNumber?.toLowerCase().includes(term),
    );
    const phoneProfiles: (typeof nameProfiles)[number][] = [];
    const seenPhoneUserIds = new Set<string>();
    for (const r of phoneMatchedOrders.slice(0, 10)) {
      if (seenPhoneUserIds.has(r.clientId)) continue;
      seenPhoneUserIds.add(r.clientId);
      const prof = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", r.clientId))
        .unique();
      if (prof) phoneProfiles.push(prof);
    }

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged: (typeof nameProfiles)[number][] = [];
    for (const p of [...nameProfiles, ...emailProfiles, ...phoneProfiles]) {
      if (!seen.has(p._id)) {
        seen.add(p._id);
        merged.push(p);
      }
    }

    return await Promise.all(
      merged.map((p) =>
        enrichProfile(
          ctx,
          p as { userId: Id<"users">; [key: string]: unknown },
        ),
      ),
    );
  },
});

/**
 * Paginated list of all user profiles, newest first.
 */
export const listClients = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("userProfile")
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map((p) =>
          enrichProfile(
            ctx,
            p as { userId: Id<"users">; [key: string]: unknown },
          ),
        ),
      ),
    };
  },
});

/**
 * Single client profile by userId, enriched with email and phone.
 */
export const getClientById = query({
  args: { userId: v.id("users") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) return null;
    return enrichProfile(
      ctx,
      profile as { userId: Id<"users">; [key: string]: unknown },
    );
  },
});

/**
 * Paginated orders for a specific client, newest first.
 */
export const listClientReceipts = query({
  args: {
    clientId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("order")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Paginated uploaded prescriptions for a specific client, newest first.
 */
export const listClientPrescriptions = query({
  args: {
    clientId: v.id("users"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("uploadedPrescription")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create an order directly for a client (no prescription required).
 * Records the admin who created it in adminWhoCreatedOrder.
 */
export const createDirectPurchaseForClient = mutation({
  args: {
    clientId: v.id("users"),
    productIds: v.array(v.id("products")),
    productsAsJsonOnDateOfPurchase: v.string(),
    subtotalInUSDCents: v.number(),
    deliveryFeeInUSDCents: v.number(),
    totalInUSDCents: v.number(),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  returns: v.id("order"),
  handler: async (ctx, args) => {
    const adminUserId = await requireAdmin(ctx);

    const orderId = await executePurchase(ctx, adminUserId, {
      clientId: args.clientId,
      productIds: args.productIds,
      uploadedPrescriptionIds: [],
      productsAsJsonOnDateOfPurchase: args.productsAsJsonOnDateOfPurchase,
      subtotalInUSDCents: args.subtotalInUSDCents,
      deliveryFeeInUSDCents: args.deliveryFeeInUSDCents,
      totalInUSDCents: args.totalInUSDCents,
      phoneNumber: args.phoneNumber,
      address: args.address,
      orderIsCollection: false,
    });

    return orderId;
  },
});

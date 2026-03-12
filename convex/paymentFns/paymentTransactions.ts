import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { Id } from "../_generated/dataModel";

// ── Public mutations ──────────────────────────────────────────────────────────

/**
 * Create a payment transaction record for an order.
 */
export const createPaymentTransaction = mutation({
  args: {
    orderId: v.id("order"),
    amountInUSDCents: v.number(),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("ecocash"),
      v.literal("bank"),
    ),
  },
  returns: v.id("paymentTransaction"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the order belongs to this user
    const order = await ctx.db.get(args.orderId);
    if (!order || order.clientId !== userId) throw new Error("Order not found");

    const txId = await ctx.db.insert("paymentTransaction", {
      orderId: args.orderId,
      userId,
      amountInUSDCents: args.amountInUSDCents,
      paymentMethod: args.paymentMethod,
      status: "pending",
    });

    return txId;
  },
});

/**
 * List payment transactions for the logged-in user, newest first.
 */
export const listMyTransactions = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const txns = await ctx.db
      .query("paymentTransaction")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich with order info
    const results = [];
    for (const tx of txns) {
      const order = await ctx.db.get(tx.orderId);
      results.push({
        ...tx,
        orderStatus: order?.status ?? null,
        orderTotal: order?.totalInUSDCents ?? null,
      });
    }
    return results;
  },
});

/**
 * Get a payment transaction by order ID (for the logged-in user).
 */
export const getTransactionByOrderId = query({
  args: { orderId: v.id("order") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const tx = await ctx.db
      .query("paymentTransaction")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .order("desc")
      .first();

    if (!tx) return null;
    // Only return if belongs to user or if called from admin context
    if (tx.userId !== userId) return null;

    return tx;
  },
});

/**
 * Get a payment transaction by order ID (admin — no user check).
 */
export const getTransactionByOrderIdAdmin = query({
  args: { orderId: v.id("order") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("paymentTransaction")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .order("desc")
      .first();

    return tx ?? null;
  },
});

/**
 * Admin: update the status of a cash payment transaction.
 * Only allowed for cash payment method.
 */
export const adminUpdateCashTransactionStatus = mutation({
  args: {
    transactionId: v.id("paymentTransaction"),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");
    if (tx.paymentMethod !== "cash")
      throw new Error("Only cash transactions can be updated this way");
    if (tx.status === "paid" || tx.status === "failed")
      throw new Error("This transaction is finalised and cannot be changed");

    await ctx.db.patch(args.transactionId, {
      status: args.status,
      processedAt: args.status !== "pending" ? Date.now() : undefined,
    });

    // Keep order status in sync
    const order = await ctx.db.get(tx.orderId);
    if (order) {
      if (args.status === "paid" && order.status === "pending") {
        await ctx.db.patch(tx.orderId, {
          status: "confirmed",
          lastModifiedAt: Date.now(),
        });
      } else if (args.status === "failed" && order.status === "pending") {
        await ctx.db.patch(tx.orderId, {
          status: "cancelled",
          lastModifiedAt: Date.now(),
        });
      }
    }

    return null;
  },
});

/**
 * Admin: paginated list of all payment transactions.
 */
export const listAllTransactions = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.any(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("paymentTransaction")
      .order("desc")
      .paginate(args.paginationOpts);

    const uniqueUserIds = [...new Set(page.page.map((t) => t.userId))];
    const userNameMap: Record<string, string> = {};
    for (const uid of uniqueUserIds) {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("byUserId", (q) => q.eq("userId", uid as Id<"users">))
        .unique();
      userNameMap[uid] = profile?.name ?? "Unknown";
    }

    return {
      ...page,
      page: page.page.map((t) => ({
        ...t,
        userName: userNameMap[t.userId] ?? "Unknown",
      })),
    };
  },
});

// ── Internal mutations (called from actions & HTTP) ───────────────────────────

/**
 * Update payment transaction with poll URL and reference from PayNow.
 */
export const updateTransactionWithPaynow = internalMutation({
  args: {
    transactionId: v.id("paymentTransaction"),
    pollUrl: v.string(),
    transactionReference: v.optional(v.string()),
    redirectUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      pollUrl: args.pollUrl,
      transactionReference: args.transactionReference,
    });
    return null;
  },
});

/**
 * Set payment transaction status to paid and order to confirmed.
 */
export const markTransactionPaid = internalMutation({
  args: { transactionId: v.id("paymentTransaction") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");

    await ctx.db.patch(args.transactionId, {
      status: "paid",
      processedAt: Date.now(),
    });

    // Mark order as confirmed
    const order = await ctx.db.get(tx.orderId);
    if (order && order.status === "pending") {
      await ctx.db.patch(tx.orderId, {
        status: "confirmed",
        lastModifiedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Set payment transaction status to failed and order to cancelled.
 */
export const markTransactionFailed = internalMutation({
  args: { transactionId: v.id("paymentTransaction") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");

    await ctx.db.patch(args.transactionId, {
      status: "failed",
      processedAt: Date.now(),
    });

    // Cancel order
    const order = await ctx.db.get(tx.orderId);
    if (order && order.status === "pending") {
      await ctx.db.patch(tx.orderId, {
        status: "cancelled",
        lastModifiedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Set an error message on a payment transaction.
 */
export const setTransactionError = internalMutation({
  args: {
    transactionId: v.id("paymentTransaction"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "failed",
      errorMessage: args.errorMessage,
      processedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Get transaction by ID (internal).
 */
export const getTransactionInternal = internalQuery({
  args: { transactionId: v.id("paymentTransaction") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transactionId);
  },
});

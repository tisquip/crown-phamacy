"use node";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { send, sendMobile, pollTransaction } from "../helpers/paynowHtml";

// ── PayNow Actions ────────────────────────────────────────────────────────

/**
 * Initiate a PayNow payment (bank web-based or EcoCash mobile).
 * Called after creating the paymentTransaction record.
 */
export const initiatePaynowPayment = action({
  args: {
    transactionId: v.id("paymentTransaction"),
    phoneNumber: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    redirectUrl: v.optional(v.string()),
    instructions: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Fetch tx details
    const tx = (await ctx.runQuery(
      internal.paymentFns.paymentTransactions.getTransactionInternal,
      { transactionId: args.transactionId },
    )) as Record<string, unknown> | null;
    if (!tx) {
      return { success: false, error: "Transaction not found" };
    }

    const integrationId = process.env.PAYNOW_INTEGRATION_ID;
    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
    const mobileAuthEmail = process.env.PAYNOW_MOBILE_AUTH_EMAIL;

    if (!integrationId || !integrationKey) {
      await ctx.runMutation(
        internal.paymentFns.paymentTransactions.setTransactionError,
        {
          transactionId: args.transactionId,
          errorMessage: "PayNow integration not configured",
        },
      );
      return { success: false, error: "Payment gateway not configured" };
    }

    // Build URLs for PayNow callback
    const convexSiteUrl =
      process.env.CONVEX_SITE_URL ?? "https://your-convex-site.convex.site";
    const siteUrl = process.env.SITE_URL ?? "https://crownpharmacy.co.zw";
    const resultUrl = `${convexSiteUrl}/paynow/callback?txId=${args.transactionId}`;
    const returnUrl = `${siteUrl}/account/purchase/${tx.orderId as string}`;

    // Create payment reference and items
    const amountUSD = (tx.amountInUSDCents as number) / 100;
    const reference = `ORDER-${(tx.orderId as string).slice(-8).toUpperCase()}`;
    const items = [{ title: "Crown Pharmacy Order", amount: amountUSD }];

    try {
      if ((tx.paymentMethod as string) === "ecocash") {
        // Mobile payment
        const phone = args.phoneNumber;
        if (!phone) {
          return {
            success: false,
            error: "Phone number required for EcoCash",
          };
        }

        if (!mobileAuthEmail) {
          return {
            success: false,
            error: "Mobile payment auth email not configured",
          };
        }

        const response = await sendMobile({
          integrationId,
          integrationKey,
          resultUrl,
          returnUrl,
          reference,
          authEmail: mobileAuthEmail,
          items,
          phone,
          method: "ecocash",
        });

        if (response.success) {
          await ctx.runMutation(
            internal.paymentFns.paymentTransactions.updateTransactionWithPaynow,
            {
              transactionId: args.transactionId,
              pollUrl: response.pollUrl ?? "",
              transactionReference: reference,
              instructions: response.instructions ?? undefined,
            },
          );
          return {
            success: true,
            instructions:
              response.instructions ??
              "A payment prompt has been sent to your phone. Please enter your EcoCash PIN to complete the payment.",
          };
        } else {
          await ctx.runMutation(
            internal.paymentFns.paymentTransactions.setTransactionError,
            {
              transactionId: args.transactionId,
              errorMessage: response.error ?? "EcoCash payment failed",
            },
          );
          return {
            success: false,
            error: response.error ?? "Failed to initiate EcoCash payment",
          };
        }
      } else {
        // Web-based payment (bank)
        const response = await send({
          integrationId,
          integrationKey,
          resultUrl,
          returnUrl,
          reference,
          items,
        });

        if (response.success) {
          await ctx.runMutation(
            internal.paymentFns.paymentTransactions.updateTransactionWithPaynow,
            {
              transactionId: args.transactionId,
              pollUrl: response.pollUrl ?? "",
              transactionReference: reference,
              redirectUrl: response.redirectUrl,
            },
          );
          return {
            success: true,
            redirectUrl: response.redirectUrl,
          };
        } else {
          await ctx.runMutation(
            internal.paymentFns.paymentTransactions.setTransactionError,
            {
              transactionId: args.transactionId,
              errorMessage: response.error ?? "Bank payment failed",
            },
          );
          return {
            success: false,
            error: response.error ?? "Failed to initiate bank payment",
          };
        }
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Unknown payment error";
      await ctx.runMutation(
        internal.paymentFns.paymentTransactions.setTransactionError,
        {
          transactionId: args.transactionId,
          errorMessage: errMsg,
        },
      );
      return { success: false, error: errMsg };
    }
  },
});

/**
 * Poll PayNow for payment status. Can be called from HTTP endpoint or user action.
 */
export const pollPaynowStatus = action({
  args: { transactionId: v.id("paymentTransaction") },
  returns: v.object({
    success: v.boolean(),
    status: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const tx = (await ctx.runQuery(
      internal.paymentFns.paymentTransactions.getTransactionInternal,
      { transactionId: args.transactionId },
    )) as Record<string, unknown> | null;

    if (!tx) {
      return { success: false, error: "Transaction not found" };
    }

    if (!tx.pollUrl) {
      return { success: false, error: "No poll URL available" };
    }

    if ((tx.status as string) === "paid") {
      return { success: true, status: "paid" };
    }

    if ((tx.status as string) === "failed") {
      return { success: true, status: "failed" };
    }

    const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;

    if (!integrationKey) {
      return { success: false, error: "PayNow not configured" };
    }

    try {
      const statusResponse = await pollTransaction({
        pollUrl: tx.pollUrl as string,
        integrationKey,
      });

      const status = statusResponse.status.toLowerCase();

      if (status === "paid") {
        await ctx.runMutation(
          internal.paymentFns.paymentTransactions.markTransactionPaid,
          { transactionId: args.transactionId },
        );
        return { success: true, status: "paid" };
      } else if (status === "cancelled" || status === "failed") {
        await ctx.runMutation(
          internal.paymentFns.paymentTransactions.markTransactionFailed,
          { transactionId: args.transactionId },
        );
        return { success: true, status: "failed" };
      } else {
        return { success: true, status: "pending" };
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to check status",
      };
    }
  },
});

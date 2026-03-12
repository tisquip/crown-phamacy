"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { sendEmailViaPostal } from "../lib/postal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cents(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function paymentLabel(method: string): string {
  switch (method) {
    case "ecocash":
      return "EcoCash";
    case "bank":
      return "PayNow (Bank / Card)";
    case "cash":
      return "Cash on Delivery / Collection";
    default:
      return method;
  }
}

// ── HTML builders ─────────────────────────────────────────────────────────────

function buildOrderEmailHtml(order: {
  orderId: string;
  clientName: string | null;
  clientPhone: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceInUSDCents: number;
    brandName?: string | null;
  }>;
  subtotalInUSDCents: number;
  deliveryFeeInUSDCents: number;
  totalInUSDCents: number;
  paymentMethod: string;
  deliveryMethod: string;
  address: string | null;
  notes: string | null;
}): string {
  const ref = order.orderId.slice(-8).toUpperCase();

  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">
          <span style="font-weight:600;color:#111827;">${escapeHtml(item.name)}</span>
          ${item.brandName ? `<br><span style="font-size:12px;color:#6b7280;">${escapeHtml(item.brandName)}</span>` : ""}
        </td>
        <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#374151;">${item.quantity}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e5e7eb;color:#374151;">${cents(item.unitPriceInUSDCents)}</td>
        <td style="padding:8px 12px;text-align:right;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;">${cents(item.unitPriceInUSDCents * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>New Order #${ref}</title></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.12);">

    <!-- Header -->
    <div style="background:#0f766e;padding:24px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;">🛍️ New Order Received</h1>
      <p style="margin:6px 0 0;color:#99f6e4;font-size:14px;">Reference: <strong>#${ref}</strong></p>
    </div>

    <!-- Body -->
    <div style="padding:24px;">

      <!-- Customer -->
      <h2 style="margin:0 0 12px;color:#111827;font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Customer Details</h2>
      <table style="width:100%;margin-bottom:20px;font-size:14px;">
        <tr>
          <td style="color:#6b7280;padding:4px 0;width:130px;">Name</td>
          <td style="color:#111827;font-weight:600;">${escapeHtml(order.clientName ?? "Unknown")}</td>
        </tr>
        ${order.clientPhone ? `<tr><td style="color:#6b7280;padding:4px 0;">Phone</td><td style="color:#111827;">${escapeHtml(order.clientPhone)}</td></tr>` : ""}
        <tr>
          <td style="color:#6b7280;padding:4px 0;">Payment</td>
          <td style="color:#111827;">${paymentLabel(order.paymentMethod)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;padding:4px 0;">Delivery</td>
          <td style="color:#111827;">${order.deliveryMethod === "collection" ? "Branch Collection" : "Delivery"}</td>
        </tr>
        ${order.address ? `<tr><td style="color:#6b7280;padding:4px 0;vertical-align:top;">Address</td><td style="color:#111827;">${escapeHtml(order.address)}</td></tr>` : ""}
        ${order.notes ? `<tr><td style="color:#6b7280;padding:4px 0;vertical-align:top;">Notes</td><td style="color:#111827;font-style:italic;">${escapeHtml(order.notes)}</td></tr>` : ""}
      </table>

      <!-- Items -->
      <h2 style="margin:0 0 12px;color:#111827;font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Order Items</h2>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:16px;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;color:#374151;font-weight:600;">Product</th>
            <th style="padding:8px 12px;text-align:center;color:#374151;font-weight:600;">Qty</th>
            <th style="padding:8px 12px;text-align:right;color:#374151;font-weight:600;">Unit</th>
            <th style="padding:8px 12px;text-align:right;color:#374151;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Totals -->
      <table style="width:100%;font-size:14px;background:#f9fafb;border-radius:6px;padding:12px 16px;box-sizing:border-box;">
        <tr>
          <td style="color:#6b7280;padding:4px 0;">Subtotal</td>
          <td style="text-align:right;color:#374151;">${cents(order.subtotalInUSDCents)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;padding:4px 0;">Delivery</td>
          <td style="text-align:right;color:#374151;">${order.deliveryFeeInUSDCents === 0 ? "FREE" : cents(order.deliveryFeeInUSDCents)}</td>
        </tr>
        <tr style="border-top:2px solid #e5e7eb;">
          <td style="font-size:16px;font-weight:700;color:#111827;padding:8px 0 4px;">Grand Total</td>
          <td style="text-align:right;font-size:16px;font-weight:700;color:#0f766e;padding:8px 0 4px;">${cents(order.totalInUSDCents)}</td>
        </tr>
      </table>

    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Crown Pharmacy — Admin Notifications</p>
    </div>

  </div>
</body>
</html>`;
}

function buildPrescriptionEmailHtml(data: {
  prescriptionId: string;
  clientName: string | null;
  clientPhone: string | null;
  fileName: string | null;
  notes: string | null;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>New Prescription Upload</title></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.12);">

    <!-- Header -->
    <div style="background:#0f766e;padding:24px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;">📋 New Prescription Uploaded</h1>
      <p style="margin:6px 0 0;color:#99f6e4;font-size:14px;">Awaiting admin review &amp; quotation</p>
    </div>

    <!-- Body -->
    <div style="padding:24px;">
      <h2 style="margin:0 0 12px;color:#111827;font-size:16px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Prescription Details</h2>
      <table style="width:100%;font-size:14px;margin-bottom:20px;">
        <tr>
          <td style="color:#6b7280;padding:4px 0;width:130px;">Customer</td>
          <td style="color:#111827;font-weight:600;">${escapeHtml(data.clientName ?? "Unknown")}</td>
        </tr>
        ${data.clientPhone ? `<tr><td style="color:#6b7280;padding:4px 0;">Phone</td><td style="color:#111827;">${escapeHtml(data.clientPhone)}</td></tr>` : ""}
        ${data.fileName ? `<tr><td style="color:#6b7280;padding:4px 0;">File</td><td style="color:#111827;">${escapeHtml(data.fileName)}</td></tr>` : ""}
        ${data.notes ? `<tr><td style="color:#6b7280;padding:4px 0;vertical-align:top;">Notes</td><td style="color:#111827;font-style:italic;">${escapeHtml(data.notes)}</td></tr>` : ""}
      </table>

      <div style="padding:14px 16px;background:#fef9c3;border-left:4px solid #eab308;border-radius:4px;">
        <p style="margin:0;color:#713f12;font-size:14px;">
          Please log in to the admin panel, review this prescription, and send a quotation to the customer.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Crown Pharmacy — Admin Notifications</p>
    </div>

  </div>
</body>
</html>`;
}

/** Minimal HTML escaping to prevent injection via user-supplied strings. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ── Internal actions ──────────────────────────────────────────────────────────

/**
 * Send an email notification when a new order is created.
 *
 * Required env vars:
 *   ORDERS_NOTIFICATION_EMAIL – recipient address for order alerts
 *   ORDERS_NOTIFICATION_WHATSAPP_NUMBER – WhatsApp number (reserved for future use)
 *
 * Postal env vars (POSTAL_SERVER_URL, POSTAL_API_KEY, POSTAL_FROM_ADDRESS)
 * must also be configured.
 */
export const notifyNewOrder = internalAction({
  args: { orderId: v.id("order") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notificationEmail = process.env.ORDERS_NOTIFICATION_EMAIL;
    if (!notificationEmail) {
      console.log(
        "[notifications] ORDERS_NOTIFICATION_EMAIL not set — skipping order notification",
      );
      return null;
    }

    const data = await ctx.runQuery(
      internal.helpers.notificationData.getOrderDataForNotification,
      { orderId: args.orderId },
    );

    if (!data) {
      console.warn(
        "[notifications] Order not found for notification:",
        args.orderId,
      );
      return null;
    }

    const ref = args.orderId.slice(-8).toUpperCase();
    const subject = `New Order #${ref} — ${data.clientName ?? "Customer"} (${data.paymentMethod === "cash" ? "Cash" : data.paymentMethod === "ecocash" ? "EcoCash" : "PayNow"})`;

    try {
      await sendEmailViaPostal({
        to: [notificationEmail],
        subject,
        htmlBody: buildOrderEmailHtml(data),
      });
      console.log("[notifications] Order notification sent for", ref);
    } catch (err) {
      // Log but don't throw — notification failure should not break the order flow
      console.error("[notifications] Failed to send order email:", err);
    }

    // WhatsApp notification — reserved for future implementation
    // const whatsappNumber = process.env.ORDERS_NOTIFICATION_WHATSAPP_NUMBER;
    // if (whatsappNumber) { ... }

    return null;
  },
});

/**
 * Send an email notification when a new prescription is uploaded.
 *
 * Uses the same ORDERS_NOTIFICATION_EMAIL env var as order notifications.
 */
export const notifyNewPrescription = internalAction({
  args: { prescriptionId: v.id("uploadedPrescription") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notificationEmail = process.env.ORDERS_NOTIFICATION_EMAIL;
    if (!notificationEmail) {
      console.log(
        "[notifications] ORDERS_NOTIFICATION_EMAIL not set — skipping prescription notification",
      );
      return null;
    }

    const data = await ctx.runQuery(
      internal.helpers.notificationData.getPrescriptionDataForNotification,
      { prescriptionId: args.prescriptionId },
    );

    if (!data) {
      console.warn(
        "[notifications] Prescription not found for notification:",
        args.prescriptionId,
      );
      return null;
    }

    const subject = `New Prescription Upload — ${data.clientName ?? "Customer"}${data.fileName ? ` (${data.fileName})` : ""}`;

    try {
      await sendEmailViaPostal({
        to: [notificationEmail],
        subject,
        htmlBody: buildPrescriptionEmailHtml(data),
      });
      console.log(
        "[notifications] Prescription notification sent for",
        args.prescriptionId,
      );
    } catch (err) {
      console.error("[notifications] Failed to send prescription email:", err);
    }

    // WhatsApp notification — reserved for future implementation
    // const whatsappNumber = process.env.ORDERS_NOTIFICATION_WHATSAPP_NUMBER;
    // if (whatsappNumber) { ... }

    return null;
  },
});

import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://crownpharmacy.co.zw",
  "http://crownpharmacy.co.zw",
]);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

http.route({
  path: "/getImage",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }),
});

http.route({
  path: "/getImage",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const corsHeaders = getCorsHeaders(request);
    const { searchParams } = new URL(request.url);
    const storageId = searchParams.get("storageId") as Id<"_storage"> | null;
    console.log("getImage request by", storageId);
    if (!storageId) {
      return new Response("Missing storageId", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Block prescription images from this public endpoint
    const isPrescription = await ctx.runQuery(
      internal.fileStorage.isPrescriptionImage,
      { storageId },
    );
    if (isPrescription) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    const blob = await ctx.storage.get(storageId);
    if (blob === null) {
      return new Response("Image not found", {
        status: 404,
        headers: corsHeaders,
      });
    }
    return new Response(blob, { headers: corsHeaders });
  }),
});

// ── PayNow callback ───────────────────────────────────────────────────────────
// PayNow POSTs/GETs to this endpoint when a transaction status changes.
// The transactionId is passed as a query parameter ?txId=...
http.route({
  path: "/paynow/callback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("txId");

    // Log the body for debugging
    const body = await request.text();
    console.log("PayNow callback body:", body);

    if (!transactionId) {
      return new Response("Missing txId", { status: 400 });
    }

    try {
      await ctx.runAction(api.paymentFns.paymentActions.pollPaynowStatus, {
        transactionId: transactionId as Id<"paymentTransaction">,
      });
    } catch (err) {
      console.error("PayNow callback processing error:", err);
    }

    return new Response("OK", { status: 200 });
  }),
});

http.route({
  path: "/paynow/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("txId");

    if (!transactionId) {
      return new Response("Missing txId", { status: 400 });
    }

    try {
      await ctx.runAction(api.paymentFns.paymentActions.pollPaynowStatus, {
        transactionId: transactionId as Id<"paymentTransaction">,
      });
    } catch (err) {
      console.error("PayNow callback processing error:", err);
    }

    return new Response("OK", { status: 200 });
  }),
});

auth.addHttpRoutes(http);

export default http;

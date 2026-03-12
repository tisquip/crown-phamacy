import { sha512 } from "js-sha512";

// ─── Constants ─────────────────────────────────────────────

const URL_INITIATE_TRANSACTION =
  "https://www.paynow.co.zw/interface/initiatetransaction";
const URL_INITIATE_MOBILE_TRANSACTION =
  "https://www.paynow.co.zw/interface/remotetransaction";
const RESPONSE_OK = "ok";
const RESPONSE_ERROR = "error";
const INNBUCKS_DEEPLINK_PREFIX = "schinn.wbpycode://innbucks.co.zw?pymInnCode=";
const GOOGLE_QR_PREFIX =
  "https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=";

// ─── Exported Types ────────────────────────────────────────

/** A single item in the payment cart. */
export interface PaynowItem {
  title: string;
  amount: number;
  quantity?: number;
}

/** Input for a standard web-based payment via {@link send}. */
export interface SendRequest {
  integrationId: string;
  integrationKey: string;
  resultUrl: string;
  returnUrl: string;
  reference: string;
  authEmail?: string;
  items: PaynowItem[];
}

/** Input for a mobile money payment via {@link sendMobile}. */
export interface SendMobileRequest {
  integrationId: string;
  integrationKey: string;
  resultUrl: string;
  returnUrl: string;
  reference: string;
  /** Required for mobile transactions. */
  authEmail: string;
  items: PaynowItem[];
  /** The phone number to charge, e.g. "0771234567". */
  phone: string;
  /** Express checkout method, e.g. "ecocash", "onemoney", "innbucks". */
  method: string;
}

/** Input for polling a transaction via {@link pollTransaction}. */
export interface PollTransactionRequest {
  pollUrl: string;
  integrationKey: string;
}

/** InnBucks-specific information returned when the payment method is InnBucks. */
export interface InnbucksInfo {
  authorizationCode: string;
  deepLinkUrl: string;
  qrCode: string;
  expiresAt: string;
}

/** Response returned by {@link send} and {@link sendMobile}. */
export interface PaynowInitResponse {
  success: boolean;
  hasRedirect: boolean;
  redirectUrl?: string;
  error?: string;
  pollUrl?: string;
  instructions?: string;
  status: string;
  isInnbucks: boolean;
  innbucksInfo?: InnbucksInfo[];
}

/** Response returned by {@link pollTransaction}. */
export interface PaynowStatusResponse {
  reference?: string;
  amount?: string;
  paynowReference?: string;
  pollUrl?: string;
  status: string;
  error?: string;
}

// ─── Internal Helpers ──────────────────────────────────────

function computeTotal(items: PaynowItem[]): number {
  return items.reduce(
    (sum, item) => sum + item.amount * (item.quantity ?? 1),
    0,
  );
}

function computeSummary(items: PaynowItem[]): string {
  return items.map((i) => i.title).join(", ");
}

function generateHash(
  values: { [key: string]: string },
  integrationKey: string,
): string {
  let str = "";
  for (const key of Object.keys(values)) {
    if (key !== "hash") {
      str += values[key];
    }
  }
  str += integrationKey.toLowerCase();
  return sha512(str).toUpperCase();
}

function verifyHash(
  values: { [key: string]: string },
  integrationKey: string,
): boolean {
  if (typeof values["hash"] === "undefined") return false;
  return values["hash"] === generateHash(values, integrationKey);
}

function parseQueryString(qs: string): { [key: string]: string } {
  const query: { [key: string]: string } = {};
  const str = qs.charAt(0) === "?" ? qs.substring(1) : qs;
  const pairs = str.split("&");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) {
      query[decodeURIComponent(pair.replace(/\+/g, " "))] = "";
    } else {
      query[decodeURIComponent(pair.substring(0, idx).replace(/\+/g, " "))] =
        decodeURIComponent(pair.substring(idx + 1).replace(/\+/g, " "));
    }
  }
  return query;
}

function buildFormBody(data: { [key: string]: string }): string {
  return Object.keys(data)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}

function validateItems(items: PaynowItem[]): void {
  if (!items || items.length === 0) {
    throw new Error("You need to have at least one item in cart");
  }
  if (computeTotal(items) <= 0) {
    throw new Error("The total should be greater than zero");
  }
}

function isValidEmail(email: string): boolean {
  if (!email || email.length === 0) return false;
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(email);
}

function toInitResponse(parsed: { [key: string]: string }): PaynowInitResponse {
  const status = (parsed.status || "").toLowerCase();
  const success = status === RESPONSE_OK;
  const hasRedirect =
    typeof parsed.browserurl !== "undefined" && parsed.browserurl !== "";
  let isInnbucks = false;
  let innbucksInfo: InnbucksInfo[] | undefined;

  if (typeof parsed.authorizationcode !== "undefined") {
    isInnbucks = true;
    innbucksInfo = [
      {
        authorizationCode: parsed.authorizationcode,
        deepLinkUrl: INNBUCKS_DEEPLINK_PREFIX + parsed.authorizationcode,
        qrCode: GOOGLE_QR_PREFIX + parsed.authorizationcode,
        expiresAt: parsed.authorizationexpires || "",
      },
    ];
  }

  const response: PaynowInitResponse = {
    success,
    hasRedirect,
    status,
    isInnbucks,
  };

  if (!success) {
    response.error = parsed.error;
  } else {
    response.pollUrl = parsed.pollurl;
    if (hasRedirect) response.redirectUrl = parsed.browserurl;
    if (parsed.instructions) response.instructions = parsed.instructions;
    if (innbucksInfo) response.innbucksInfo = innbucksInfo;
  }

  return response;
}

function toStatusResponse(parsed: {
  [key: string]: string;
}): PaynowStatusResponse {
  const status = (parsed.status || "").toLowerCase();
  if (status === RESPONSE_ERROR) {
    return { status, error: parsed.error };
  }
  return {
    reference: parsed.reference,
    amount: parsed.amount,
    paynowReference: parsed.paynowreference,
    pollUrl: parsed.pollurl,
    status,
  };
}

// ─── Public API ────────────────────────────────────────────

/**
 * Initiate a standard web-based Paynow transaction.
 *
 * All required data (integration credentials, cart items, URLs) is passed in
 * the `request` parameter — no external state is needed.
 *
 * @param request All the data needed to create the transaction.
 * @returns The parsed init response from Paynow.
 *
 * @example
 * ```ts
 * const result = await send({
 *   integrationId: "YOUR_ID",
 *   integrationKey: "YOUR_KEY",
 *   resultUrl: "https://example.com/result",
 *   returnUrl: "https://example.com/return",
 *   reference: "INV-001",
 *   items: [{ title: "Widget", amount: 10, quantity: 2 }],
 * });
 * if (result.success && result.hasRedirect) {
 *   window.location.href = result.redirectUrl!;
 * }
 * ```
 */
export async function send(request: SendRequest): Promise<PaynowInitResponse> {
  console.log("In Send, request received is: ", request);
  const {
    integrationId,
    integrationKey,
    resultUrl,
    returnUrl,
    reference,
    authEmail,
    items,
  } = request;

  validateItems(items);

  const data: { [key: string]: string } = {
    resulturl: resultUrl,
    returnurl: returnUrl,
    reference: reference,
    amount: computeTotal(items).toString(),
    id: integrationId,
    additionalinfo: computeSummary(items),
    authemail: authEmail ?? "",
    status: "Message",
  };

  data["hash"] = generateHash(data, integrationKey);

  const res = await fetch(URL_INITIATE_TRANSACTION, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildFormBody(data),
  });

  const text = await res.text();
  const parsed = parseQueryString(text);

  if (
    parsed.status &&
    parsed.status.toLowerCase() !== RESPONSE_ERROR &&
    !verifyHash(parsed, integrationKey)
  ) {
    throw new Error("Hashes do not match!");
  }

  return toInitResponse(parsed);
}

/**
 * Initiate a mobile money Paynow transaction (e.g. EcoCash, OneMoney, InnBucks).
 *
 * All required data (integration credentials, cart items, phone, method) is
 * passed in the `request` parameter — no external state is needed.
 *
 * @param request All the data needed to create the mobile transaction.
 * @returns The parsed init response from Paynow.
 *
 * @example
 * ```ts
 * const result = await sendMobile({
 *   integrationId: "YOUR_ID",
 *   integrationKey: "YOUR_KEY",
 *   resultUrl: "https://example.com/result",
 *   returnUrl: "https://example.com/return",
 *   reference: "INV-002",
 *   authEmail: "user@example.com",
 *   items: [{ title: "Subscription", amount: 5 }],
 *   phone: "0771234567",
 *   method: "ecocash",
 * });
 * ```
 */
export async function sendMobile(
  request: SendMobileRequest,
): Promise<PaynowInitResponse> {
  const {
    integrationId,
    integrationKey,
    resultUrl,
    returnUrl,
    reference,
    authEmail,
    items,
    phone,
    method,
  } = request;
  console.log("In SendMobile, request received is: ", request);
  validateItems(items);

  if (!isValidEmail(authEmail)) {
    throw new Error(
      "Invalid email. Please ensure that you pass a valid email address when initiating a mobile payment",
    );
  }

  const data: { [key: string]: string } = {
    resulturl: resultUrl,
    returnurl: returnUrl,
    reference: reference,
    amount: computeTotal(items).toString(),
    id: integrationId,
    additionalinfo: computeSummary(items),
    authemail: authEmail,
    phone: phone,
    method: method,
    status: "Message",
  };

  data["hash"] = generateHash(data, integrationKey);

  const res = await fetch(URL_INITIATE_MOBILE_TRANSACTION, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildFormBody(data),
  });

  const text = await res.text();
  const parsed = parseQueryString(text);

  if (
    parsed.status &&
    parsed.status.toLowerCase() !== RESPONSE_ERROR &&
    !verifyHash(parsed, integrationKey)
  ) {
    throw new Error("Hashes do not match!");
  }

  return toInitResponse(parsed);
}

/**
 * Poll a Paynow transaction to check its current status.
 *
 * @param request The poll URL (obtained from a previous init response) and
 *                the integration key for hash verification.
 * @returns The parsed status response from Paynow.
 *
 * @example
 * ```ts
 * const status = await pollTransaction({
 *   pollUrl: initResult.pollUrl!,
 *   integrationKey: "YOUR_KEY",
 * });
 * console.log(status.status); // e.g. "paid"
 * ```
 */
export async function pollTransaction(
  request: PollTransactionRequest,
): Promise<PaynowStatusResponse> {
  const { pollUrl, integrationKey } = request;

  const res = await fetch(pollUrl, {
    method: "POST",
  });

  const text = await res.text();
  if (!text || text.length === 0) {
    throw new Error("An unknown error occurred");
  }

  const parsed = parseQueryString(text);

  if (!verifyHash(parsed, integrationKey)) {
    throw new Error("Hashes do not match!");
  }

  return toStatusResponse(parsed);
}

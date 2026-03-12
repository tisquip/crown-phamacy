/**
 * Postal mail server HTTP API client.
 *
 * Uses plain `fetch` so it works natively in Convex actions without extra deps.
 *
 * Required environment variables (set via `npx convex env set`):
 *   POSTAL_SERVER_URL  – e.g. "https://postal.example.com"
 *   POSTAL_API_KEY     – Server-level API key from Postal
 *   POSTAL_FROM_ADDRESS – Sender address, e.g. "notifications@botha.co.za"
 *   POSTAL_FROM_NAME    – (optional) Sender display name, defaults to "Botha Resource Management"
 */

export interface PostalSendResult {
  /** Postal message ID per recipient (keyed by email). */
  messageIds: Record<string, string>;
}

export interface PostalEmailOptions {
  /** Recipient email addresses. */
  to: Array<string>;
  /** Email subject line (plain text). */
  subject: string;
  /** Full HTML body. */
  htmlBody: string;
  /** Optional plain-text body (fallback). */
  plainBody?: string;
}

/**
 * Send an email via the Postal HTTP API.
 *
 * @see https://docs.postalserver.io/developer/api/send-message
 */
export async function sendEmailViaPostal(
  opts: PostalEmailOptions,
): Promise<PostalSendResult> {
  const serverUrl = process.env.POSTAL_SERVER_URL;
  const apiKey = process.env.POSTAL_API_KEY;
  const fromAddress = process.env.POSTAL_FROM_ADDRESS;
  const fromName = process.env.POSTAL_FROM_NAME ?? "Crown Pharmacy Website";

  if (!serverUrl || !apiKey || !fromAddress) {
    throw new Error(
      "Postal is not configured. Set POSTAL_SERVER_URL, POSTAL_API_KEY, and POSTAL_FROM_ADDRESS environment variables via `npx convex env set`.",
    );
  }

  const url = `${serverUrl.replace(/\/+$/, "")}/api/v1/send/message`;

  const body = {
    to: opts.to,
    from: `${fromName} <${fromAddress}>`,
    sender: fromAddress,
    subject: opts.subject,
    html_body: opts.htmlBody,
    ...(opts.plainBody ? { plain_body: opts.plainBody } : {}),
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Server-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Postal API error (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    status: string;
    data: { messages: Record<string, { id: number; token: string }> };
  };

  if (json.status !== "success") {
    throw new Error(
      `Postal returned non-success status: ${JSON.stringify(json)}`,
    );
  }

  // Map email → postal message ID
  const messageIds: Record<string, string> = {};
  for (const [email, info] of Object.entries(json.data.messages)) {
    messageIds[email] = String(info.id);
  }

  return { messageIds };
}

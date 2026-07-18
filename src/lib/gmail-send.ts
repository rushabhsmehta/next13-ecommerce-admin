import { google } from "googleapis";

/**
 * Send email via Gmail API as the OAuth-linked mailbox (aagamholiday@gmail.com).
 *
 * Required env (local `.env.local` and Railway):
 * - GMAIL_CLIENT_ID       — OAuth Desktop client ID
 * - GMAIL_CLIENT_SECRET   — OAuth Desktop client secret
 * - GMAIL_REFRESH_TOKEN   — refresh_token from OAuth (e.g. ~/.gmail-mcp/credentials.json)
 *
 * Optional:
 * - GMAIL_SENDER_EMAIL    — defaults to aagamholiday@gmail.com
 */

export type SendGmailMessageInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

function requireGmailEnv() {
  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [
      !clientId && "GMAIL_CLIENT_ID",
      !clientSecret && "GMAIL_CLIENT_SECRET",
      !refreshToken && "GMAIL_REFRESH_TOKEN",
    ].filter(Boolean);
    const err = new Error(
      `Gmail is not configured. Missing: ${missing.join(", ")}. Add them to .env.local / Railway.`
    );
    (err as Error & { code?: string }).code = "GMAIL_NOT_CONFIGURED";
    throw err;
  }

  return { clientId, clientSecret, refreshToken };
}

function encodeSubject(subject: string): string {
  // RFC 2047 encoded-word for non-ASCII subjects
  if (/^[\x00-\x7F]*$/.test(subject)) {
    return subject;
  }
  const b64 = Buffer.from(subject, "utf8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

function buildRawMime(input: SendGmailMessageInput & { from: string }): string {
  const toList = Array.isArray(input.to) ? input.to.join(", ") : input.to;
  const boundary = `boundary_${Date.now()}`;
  const subject = encodeSubject(input.subject);

  if (input.html) {
    const parts = [
      `From: ${input.from}`,
      `To: ${toList}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      input.text,
      "",
      `--${boundary}`,
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 7bit",
      "",
      input.html,
      "",
      `--${boundary}--`,
    ];
    return parts.join("\r\n");
  }

  return [
    `From: ${input.from}`,
    `To: ${toList}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    input.text,
  ].join("\r\n");
}

function toBase64Url(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sendGmailMessage(input: SendGmailMessageInput): Promise<{ id: string }> {
  const { clientId, clientSecret, refreshToken } = requireGmailEnv();
  const from =
    process.env.GMAIL_SENDER_EMAIL?.trim() || "aagamholiday@gmail.com";

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const raw = toBase64Url(buildRawMime({ ...input, from }));

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  const id = res.data.id;
  if (!id) {
    throw new Error("Gmail API did not return a message id");
  }

  return { id };
}

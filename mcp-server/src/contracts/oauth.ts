import crypto from "crypto";

export type ApprovalDecision = "approve" | "deny";

export interface ApprovalTokenPayload {
  approvalId: string;
  decision: ApprovalDecision;
  actorUserId: string;
  iat: number;
  exp: number;
}

function encodeBase64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(secret: string, value: string): string {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function createApprovalToken(
  secret: string,
  payload: Omit<ApprovalTokenPayload, "iat" | "exp">,
  ttlSeconds = 300
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ApprovalTokenPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "MCP-APPROVAL" }));
  const body = encodeBase64Url(JSON.stringify(fullPayload));
  const signature = sign(secret, `${header}.${body}`);

  return `${header}.${body}.${signature}`;
}

export function verifyApprovalToken(
  secret: string,
  token: string
): ApprovalTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed approval token");
  }

  const [header, body, signature] = parts;
  const expectedSignature = sign(secret, `${header}.${body}`);
  if (!timingSafeEqualString(signature, expectedSignature)) {
    throw new Error("Invalid approval token signature");
  }

  const parsed = JSON.parse(decodeBase64Url(body)) as Partial<ApprovalTokenPayload>;
  if (
    typeof parsed.approvalId !== "string" ||
    (parsed.decision !== "approve" && parsed.decision !== "deny") ||
    typeof parsed.actorUserId !== "string" ||
    typeof parsed.iat !== "number" ||
    typeof parsed.exp !== "number"
  ) {
    throw new Error("Invalid approval token payload");
  }

  if (parsed.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error("Approval token expired");
  }

  return parsed as ApprovalTokenPayload;
}

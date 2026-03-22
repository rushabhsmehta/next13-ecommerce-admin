import assert from "node:assert/strict";
import test from "node:test";
import { createApprovalToken, verifyApprovalToken } from "./oauth.js";

test("approval tokens round-trip", () => {
  const token = createApprovalToken("secret", {
    approvalId: "approval-123",
    decision: "approve",
    actorUserId: "user_123",
  });

  const payload = verifyApprovalToken("secret", token);
  assert.equal(payload.approvalId, "approval-123");
  assert.equal(payload.decision, "approve");
  assert.equal(payload.actorUserId, "user_123");
});

test("approval tokens reject tampering", () => {
  const token = createApprovalToken("secret", {
    approvalId: "approval-123",
    decision: "approve",
    actorUserId: "user_123",
  });
  const [header, body, signature] = token.split(".");
  const tampered = `${header}.${body}.${signature.slice(0, -1)}x`;

  assert.throws(() => verifyApprovalToken("secret", tampered));
});

test("approval tokens reject expired payloads", () => {
  const token = createApprovalToken(
    "secret",
    {
      approvalId: "approval-123",
      decision: "approve",
      actorUserId: "user_123",
    },
    -1
  );

  assert.throws(() => verifyApprovalToken("secret", token), /expired/);
});


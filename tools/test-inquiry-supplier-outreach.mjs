/**
 * Pure-logic smoke tests for supplier outreach remarks (no Prisma).
 * Run: node tools/test-inquiry-supplier-outreach.mjs
 */

const PREFIX = "SUPPLIER_OUTREACH_V1:";

function optionalTrimmed(value, max) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (max != null && trimmed.length > max) {
    return `${trimmed.slice(0, Math.max(0, max - 1))}…`;
  }
  return trimmed;
}

function buildOutreachRemarks(payload) {
  const body = {
    supplierName: optionalTrimmed(payload.supplierName) || "Supplier",
    channel: payload.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
    contact: optionalTrimmed(payload.contact) || "",
  };
  const supplierId = optionalTrimmed(payload.supplierId);
  if (supplierId) body.supplierId = supplierId;
  const subject = optionalTrimmed(payload.subject);
  if (subject) body.subject = subject;
  const messagePreview = optionalTrimmed(payload.messagePreview, 2000);
  if (messagePreview) body.messagePreview = messagePreview;
  const externalId = optionalTrimmed(payload.externalId);
  if (externalId) body.externalId = externalId;
  const quoteReceivedAt = optionalTrimmed(payload.quoteReceivedAt);
  if (quoteReceivedAt) body.quoteReceivedAt = quoteReceivedAt;
  const notes = optionalTrimmed(payload.notes, 2000);
  if (notes) body.notes = notes;
  return `${PREFIX}${JSON.stringify(body)}`;
}

function parseOutreachRemarks(remarks) {
  if (!remarks || !remarks.startsWith(PREFIX)) {
    if (remarks && /^Emailed supplier\s+/i.test(remarks)) {
      const match = remarks.match(/^Emailed supplier\s+(\S+?):/i);
      return {
        supplierId: null,
        supplierName: match?.[1] || "Supplier",
        channel: "EMAIL",
        contact: match?.[1] || "",
        quoteReceivedAt: null,
      };
    }
    return null;
  }
  const raw = JSON.parse(remarks.slice(PREFIX.length));
  return {
    supplierId: raw.supplierId ?? null,
    supplierName: raw.supplierName || "Supplier",
    channel: raw.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
    contact: raw.contact || "",
    quoteReceivedAt: raw.quoteReceivedAt ?? null,
    messagePreview: raw.messagePreview ?? null,
  };
}

function shouldSetAskedToSupplier(currentStatus) {
  const normalized = (currentStatus || "").toUpperCase();
  return !["CONFIRMED", "CANCELLED"].includes(normalized);
}

function summarize(actions) {
  const quoteByKey = new Map();
  const outreach = [];
  for (const action of actions) {
    const parsed = parseOutreachRemarks(action.remarks);
    if (!parsed) continue;
    const key = `${parsed.supplierId || ""}|${parsed.contact}|${parsed.channel}`;
    if (action.actionType === "SUPPLIER_QUOTE_RECEIVED") {
      quoteByKey.set(key, parsed.quoteReceivedAt || action.actionDate);
      continue;
    }
    if (
      action.actionType !== "EMAIL_SUPPLIER" &&
      action.actionType !== "WHATSAPP_SUPPLIER"
    ) {
      continue;
    }
    outreach.push({ ...parsed, actionDate: action.actionDate });
  }
  return outreach.map((item) => {
    const key = `${item.supplierId || ""}|${item.contact}|${item.channel}`;
    const quoteAt = quoteByKey.get(key);
    return quoteAt && !item.quoteReceivedAt
      ? { ...item, quoteReceivedAt: quoteAt }
      : item;
  });
}

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed += 1;
  console.log(`PASS: ${msg}`);
}

const remarks = buildOutreachRemarks({
  supplierId: "sup-1",
  supplierName: "LH TRAVELS",
  channel: "EMAIL",
  contact: "lh@example.com",
  subject: "Quote request",
  externalId: "gmail-123",
});
assert(remarks.startsWith(PREFIX), "build prefix");
const parsed = parseOutreachRemarks(remarks);
assert(parsed.supplierName === "LH TRAVELS", "parse name");
assert(parsed.channel === "EMAIL", "parse channel");
assert(parsed.contact === "lh@example.com", "parse contact");

const longPreview = "A".repeat(500);
const longRemarks = buildOutreachRemarks({
  supplierId: "17e43f05-95bf-4886-b5e1-6e1a8e873c2a",
  supplierName: "Namho DMC",
  channel: "WHATSAPP",
  contact: "919876543210",
  messagePreview: longPreview,
});
const longParsed = parseOutreachRemarks(longRemarks);
assert(longParsed.messagePreview === longPreview, "long preview kept (Text)");

const legacy = parseOutreachRemarks(
  "Emailed supplier vendor@example.com: Hotel quote (Goa). Gmail id: abc"
);
assert(legacy?.contact === "vendor@example.com", "legacy email parse");

assert(shouldSetAskedToSupplier("PENDING") === true, "status pending ok");
assert(shouldSetAskedToSupplier("HOT_QUERY") === true, "status hot ok");
assert(shouldSetAskedToSupplier("CONFIRMED") === false, "status confirmed blocked");
assert(shouldSetAskedToSupplier("CANCELLED") === false, "status cancelled blocked");

const asked = buildOutreachRemarks({
  supplierId: "sup-1",
  supplierName: "LH TRAVELS",
  channel: "WHATSAPP",
  contact: "919999999999",
});
const quote = buildOutreachRemarks({
  supplierId: "sup-1",
  supplierName: "LH TRAVELS",
  channel: "WHATSAPP",
  contact: "919999999999",
  quoteReceivedAt: "2026-07-20T10:00:00.000Z",
});
const summary = summarize([
  {
    actionType: "WHATSAPP_SUPPLIER",
    remarks: asked,
    actionDate: "2026-07-19T10:00:00.000Z",
  },
  {
    actionType: "SUPPLIER_QUOTE_RECEIVED",
    remarks: quote,
    actionDate: "2026-07-20T10:00:00.000Z",
  },
]);
assert(summary.length === 1, "summary length");
assert(summary[0].quoteReceivedAt === "2026-07-20T10:00:00.000Z", "quote linked");

console.log(`\n${passed} assertions passed`);

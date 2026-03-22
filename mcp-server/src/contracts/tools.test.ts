import assert from "node:assert/strict";
import test from "node:test";
import {
  getSharedToolContract,
  getToolMetadata,
  normalizeToolParams,
  SHARED_TOOL_CONTRACTS,
} from "./tools.js";

test("shared registry contains exactly the override tools", () => {
  const overrideNames = Object.keys(SHARED_TOOL_CONTRACTS);
  assert.ok(overrideNames.length > 0);

  for (const toolName of overrideNames) {
    const contract = getSharedToolContract(toolName);
    assert.ok(contract, `Expected contract for override tool ${toolName}`);
    assert.equal(contract?.name, toolName);
    assert.equal(typeof contract?.description, "string");
  }
});

test("tools without overrides return null from getSharedToolContract", () => {
  assert.equal(getSharedToolContract("list_inquiries"), null);
  assert.equal(getSharedToolContract("create_inquiry"), null);
  assert.equal(getSharedToolContract("generate_itinerary"), null);
});

test("normalizes legacy follow-up date alias", () => {
  const params = normalizeToolParams("list_follow_ups_due", { date: "2026-04-01" });
  assert.deepEqual(params, { asOfDate: "2026-04-01" });
});

test("normalizes customer contact aliases", () => {
  const params = normalizeToolParams("list_customers", {
    name: "Rahul",
    contactNumber: "9876543210",
    limit: 10,
  });
  assert.deepEqual(params, {
    name: "Rahul",
    contact: "9876543210",
    limit: 10,
  });
});

test("preserves update inquiry destination fields", () => {
  const params = normalizeToolParams("update_inquiry", {
    inquiryId: "inq_123",
    locationName: "Goa",
    remarks: "Needs beach resort",
  });
  assert.deepEqual(params, {
    inquiryId: "inq_123",
    locationName: "Goa",
    remarks: "Needs beach resort",
  });
});

test("tool metadata marks safe read tools as retryable", () => {
  assert.deepEqual(getToolMetadata("list_inquiries"), { access: "read", retryable: true });
  assert.deepEqual(getToolMetadata("create_inquiry"), { access: "write", retryable: false });
  assert.deepEqual(getToolMetadata("generate_itinerary"), { access: "read", retryable: false });
});
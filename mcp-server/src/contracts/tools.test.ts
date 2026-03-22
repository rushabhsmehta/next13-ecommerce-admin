import assert from "node:assert/strict";
import test from "node:test";
import { GENERATED_TOOL_CONTRACTS } from "./catalog.js";
import {
  getSharedToolContract,
  getToolMetadata,
  normalizeToolParams,
  SHARED_TOOL_CONTRACTS,
} from "./tools.js";

test("generated catalog is fully exposed through the shared registry", () => {
  const generatedToolNames = Object.keys(GENERATED_TOOL_CONTRACTS);
  assert.ok(generatedToolNames.length > 0);

  for (const toolName of generatedToolNames) {
    const contract = getSharedToolContract(toolName);
    assert.ok(contract, `Expected shared contract for ${toolName}`);
    assert.equal(contract?.name, toolName);
    assert.equal(typeof contract?.description, "string");
  }

  assert.ok(Object.keys(SHARED_TOOL_CONTRACTS).length >= generatedToolNames.length);
});

test("shared registry includes previously inferred tools", () => {
  assert.ok(getSharedToolContract("list_inquiries"));
  assert.ok(getSharedToolContract("create_inquiry"));
  assert.ok(getSharedToolContract("generate_itinerary"));
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
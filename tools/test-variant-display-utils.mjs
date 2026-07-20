/**
 * Smoke tests for partial-snapshot merge helpers.
 * Run: node tools/test-variant-display-utils.mjs
 */

function parseSelectedVariantIds(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((id) => typeof id === "string" && id.length > 0);
  }
  return [];
}

function filterVariantSnapshotsForDisplay(snapshots, activeVariantIds) {
  if (!snapshots?.length || activeVariantIds.length === 0) return [];
  const activeSet = new Set(activeVariantIds);
  return snapshots.filter((snapshot) => {
    const sourceId = snapshot.sourceVariantId ?? "";
    const snapshotId = snapshot.id ?? "";
    return activeSet.has(sourceId) || activeSet.has(snapshotId);
  });
}

function getMissingActiveVariantIds(snapshots, activeVariantIds) {
  if (activeVariantIds.length === 0) return [];
  const covered = new Set();
  for (const snapshot of snapshots || []) {
    if (snapshot.sourceVariantId) covered.add(snapshot.sourceVariantId);
    if (snapshot.id) covered.add(snapshot.id);
  }
  return activeVariantIds.filter((id) => !covered.has(id));
}

function mergeVariantSnapshotsWithSynthetics(existing, synthetics, activeVariantIds) {
  const activeSet = new Set(activeVariantIds);
  const byActiveId = new Map();
  const keyFor = (snap) => {
    if (snap.sourceVariantId && activeSet.has(snap.sourceVariantId)) {
      return snap.sourceVariantId;
    }
    if (snap.id && activeSet.has(snap.id)) return snap.id;
    return null;
  };
  for (const snap of existing) {
    const key = keyFor(snap);
    if (key) byActiveId.set(key, snap);
  }
  for (const snap of synthetics) {
    const key = keyFor(snap);
    if (key && !byActiveId.has(key)) byActiveId.set(key, snap);
  }
  return activeVariantIds
    .map((id) => byActiveId.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed += 1;
  console.log(`PASS: ${msg}`);
}

const snapshots = [
  { id: "snap-a", sourceVariantId: "v1", sortOrder: 0 },
  { id: "snap-b", sourceVariantId: "v2", sortOrder: 1 },
];
assert(
  JSON.stringify(getMissingActiveVariantIds(snapshots, ["v1", "v2", "custom-3"])) ===
    JSON.stringify(["custom-3"]),
  "missing custom id"
);

const existing = filterVariantSnapshotsForDisplay(
  [...snapshots, { id: "stale", sourceVariantId: "old", sortOrder: 9 }],
  ["v1", "v2", "custom-3"]
);
const merged = mergeVariantSnapshotsWithSynthetics(
  existing,
  [{ id: "custom-3", sourceVariantId: "custom-3", sortOrder: 2 }],
  ["v1", "v2", "custom-3"]
);
assert(merged.length === 3, "merged length 3");
assert(
  merged.map((s) => s.sourceVariantId).join(",") === "v1,v2,custom-3",
  "merged order"
);
assert(parseSelectedVariantIds(["v1", "v2"]).length === 2, "parse ids");

console.log(`\n${passed} assertions passed`);

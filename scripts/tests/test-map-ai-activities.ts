/**
 * Regression tests for mapAiActivitiesForWebForm.
 * Run: npx ts-node --transpile-only --compiler-options "{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}" scripts/tests/test-map-ai-activities.ts
 */

import {
  mapAiActivitiesForWebForm,
  escapeHtmlForAiActivity,
} from "../../src/lib/ai/map-ai-activities";

let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
  } else {
    console.error(`  ❌ ${message}`);
    failed += 1;
  }
}

console.log("🧪 mapAiActivitiesForWebForm regression tests\n");

console.log("1) Titled activities with empty descriptions must survive (Gemini shape)");
{
  const mapped = mapAiActivitiesForWebForm([
    { activityTitle: "Airport pickup", activityDescription: "" },
    { activityTitle: "Tea plantation visit", activityDescription: "" },
  ]);
  assert(mapped.length === 2, `expected 2 activities, got ${mapped.length}`);
  assert(
    mapped[0]?.activityTitle === "Airport pickup",
    `first title: ${mapped[0]?.activityTitle}`
  );
  assert(
    mapped[1]?.activityTitle === "Tea plantation visit",
    `second title: ${mapped[1]?.activityTitle}`
  );
}

console.log("\n2) Roman-numeral blob with empty title still maps to one row");
{
  const mapped = mapAiActivitiesForWebForm([
    {
      activityTitle: "",
      activityDescription:
        "i. Arrival transfer.\nii. Rice terraces.\niii. Temple visit.",
    },
  ]);
  assert(mapped.length === 1, `expected 1 activity, got ${mapped.length}`);
  assert(
    mapped[0]?.activityTitle === "Activity 1",
    `fallback title: ${mapped[0]?.activityTitle}`
  );
  assert(
    Boolean(mapped[0]?.activityDescription.includes("<br>")),
    "newlines converted to <br>"
  );
}

console.log("\n3) Maps all activities, not only the first");
{
  const mapped = mapAiActivitiesForWebForm([
    { activityTitle: "A", activityDescription: "one" },
    { activityTitle: "B", activityDescription: "two" },
    { activityTitle: "C", activityDescription: "three" },
  ]);
  assert(mapped.length === 3, `expected 3 activities, got ${mapped.length}`);
}

console.log("\n4) Legacy string[] format");
{
  const mapped = mapAiActivitiesForWebForm(["City walk", "Sunset point"]);
  assert(mapped.length === 2, `expected 2 activities, got ${mapped.length}`);
  assert(mapped[0]?.activityTitle === "City walk", "string title preserved");
}

console.log("\n5) XSS escaping");
{
  const mapped = mapAiActivitiesForWebForm([
    {
      activityTitle: "Unsafe",
      activityDescription: '<script>alert("xss")</script>',
    },
  ]);
  const desc = mapped[0]?.activityDescription ?? "";
  assert(desc.includes("&lt;script&gt;"), "script tags escaped");
  assert(!desc.includes("<script>"), "raw script tag removed");
}

console.log("\n6) Title/description aliases");
{
  const mapped = mapAiActivitiesForWebForm([
    { title: "Alias title", description: "Alias desc" },
  ]);
  assert(mapped[0]?.activityTitle === "Alias title", "title alias");
  assert(
    mapped[0]?.activityDescription === "Alias desc",
    "description alias"
  );
}

console.log("\n7) includeLocationId option");
{
  const mapped = mapAiActivitiesForWebForm(
    [{ activityTitle: "Pickup", activityDescription: "Meet at gate" }],
    { includeLocationId: true, fallbackLocationId: "loc-99" }
  );
  assert(mapped[0]?.locationId === "loc-99", "fallback locationId applied");
}

console.log("\n8) escapeHtmlForAiActivity helper");
{
  const escaped = escapeHtmlForAiActivity(`a & b <c> "d" 'e'`);
  assert(escaped.includes("&amp;"), "ampersand escaped");
  assert(escaped.includes("&lt;c&gt;"), "angle brackets escaped");
}

if (failed > 0) {
  console.error(`\n❌ ${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\n🎉 All mapAiActivitiesForWebForm tests passed");

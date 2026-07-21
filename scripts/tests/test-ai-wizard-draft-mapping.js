/**
 * @deprecated Prefer test-ai-wizard-draft-mapping.ts which imports the shared helper.
 * Kept as a thin pointer so existing run instructions still work.
 *
 * Run the TypeScript suite instead:
 *   $env:TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}'
 *   npx ts-node --transpile-only scripts/tests/test-ai-wizard-draft-mapping.ts
 *   npx ts-node --transpile-only scripts/tests/test-map-ai-activities.ts
 */

console.log(
  "⚠️  This .js stub is deprecated. Run scripts/tests/test-ai-wizard-draft-mapping.ts and scripts/tests/test-map-ai-activities.ts with ts-node."
);
process.exit(0);

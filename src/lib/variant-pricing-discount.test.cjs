const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs", moduleResolution: "node" },
});
require("tsconfig-paths").register({
  baseUrl: path.resolve(__dirname, "../.."),
  paths: { "@/*": ["src/*"] },
});

const {
  applyPercentDiscountToPricingComponents,
  clonePricingComponents,
  computeVariantDiscount,
} = require("./variant-pricing-discount");

test("applyPercentDiscountToPricingComponents reduces base price by percentage", () => {
  const items = [{ name: "Per Person cost", price: "38850", description: "" }];
  const result = applyPercentDiscountToPricingComponents(items, 5);
  assert.equal(result[0].price, "36908");
});

test("applyPercentDiscountToPricingComponents recalculates standard descriptions", () => {
  const items = [
    {
      name: "Per Person cost",
      price: "38850",
      description: "4 Adults × Rs.38,850 = Rs.1,55,400",
    },
  ];
  const result = applyPercentDiscountToPricingComponents(items, 5);
  assert.equal(result[0].price, "36908");
  assert.equal(result[0].description, "4 Adults × Rs.36,908 = Rs.1,47,632");
});

test("applyPercentDiscountToPricingComponents skips zero-price rows", () => {
  const items = [
    { name: "Empty", price: "", description: "" },
    { name: "Zero", price: "0", description: "" },
  ];
  const result = applyPercentDiscountToPricingComponents(items, 10);
  assert.equal(result[0].price, "");
  assert.equal(result[1].price, "0");
});

test("clonePricingComponents returns independent copies", () => {
  const items = [{ name: "Adult", price: "1000", description: "x" }];
  const cloned = clonePricingComponents(items);
  cloned[0].price = "2000";
  assert.equal(items[0].price, "1000");
});

test("computeVariantDiscount percent aligns with component discount use case", () => {
  const result = computeVariantDiscount(173100, { type: "percent", inputValue: 5 });
  assert.equal(result.amount, 8655);
  assert.equal(result.totalCost, 164445);
});

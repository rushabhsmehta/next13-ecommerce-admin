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
  buildComponentPricingDescription,
  clonePricingComponents,
  computePricingLineAmounts,
  computeVariantDiscount,
} = require("./variant-pricing-discount");

test("applyPercentDiscountToPricingComponents keeps original base price", () => {
  const items = [{ name: "Per Person cost", price: "38850", description: "" }];
  const result = applyPercentDiscountToPricingComponents(items, 5);
  assert.equal(result[0].price, "38850");
  assert.match(result[0].description, /Discount \(5%\)/);
  assert.match(result[0].description, /GST \(5%\)/);
});

test("applyPercentDiscountToPricingComponents recalculates qty descriptions with GST on discounted amount", () => {
  const items = [
    {
      name: "Per Person cost",
      price: "38850",
      description: "4 Adults × Rs.38,850 = Rs.1,55,400",
    },
  ];
  const result = applyPercentDiscountToPricingComponents(items, 5);
  assert.equal(result[0].price, "38850");
  assert.match(result[0].description, /^4 Adults × Rs\. 38,850 = Rs\. 1,55,400 − Discount \(5%\)/);

  const amounts = computePricingLineAmounts({
    unitBase: 38850,
    discountPercent: 5,
    qty: 4,
  });
  assert.equal(amounts.discountAmount, 7770);
  assert.equal(amounts.afterDiscount, 147630);
  assert.equal(amounts.gstAmount, 7382);
  assert.equal(amounts.netLineTotal, 155012);
  assert.equal(amounts.netUnitPrice, 38753);
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

test("buildComponentPricingDescription computes net per unit with 10% discount", () => {
  const { description, netUnitPrice } = buildComponentPricingDescription(
    25000,
    "",
    { type: "percent", inputValue: 10, amount: 2500 }
  );
  assert.match(description, /Rs\. 25,000 − Discount \(10%\) Rs\. 2,500 = Rs\. 22,500 \+ GST \(5%\) Rs\. 1,125 = Rs\. 23,625/);
  assert.equal(netUnitPrice, 23625);
});

test("buildComponentPricingDescription without discount includes GST on base", () => {
  const { description, netUnitPrice } = buildComponentPricingDescription(25000, "", null);
  assert.match(description, /Rs\. 25,000 \+ GST \(5%\) Rs\. 1,250 = Rs\. 26,250/);
  assert.equal(netUnitPrice, 26250);
});

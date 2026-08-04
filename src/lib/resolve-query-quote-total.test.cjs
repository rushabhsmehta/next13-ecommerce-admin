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
  resolveQueryQuoteTotal,
  hasResolvedQueryQuoteTotal,
} = require("./resolve-query-quote-total");

test("resolveQueryQuoteTotal adds 5% GST to confirmed variant totalCost", () => {
  const quote = resolveQueryQuoteTotal({
    confirmedVariantId: "lux",
    variantPricingData: {
      lux: { totalCost: 574000 },
      std: { totalCost: 400000 },
    },
  });

  assert.equal(quote.source, "confirmed");
  assert.equal(quote.variantId, "lux");
  assert.equal(quote.total, 602700);
  assert.equal(quote.totalDisplay, "602700");
});

test("resolveQueryQuoteTotal adds GST for single priced variant", () => {
  const quote = resolveQueryQuoteTotal({
    variantPricingData: {
      only: { totalCost: 574000 },
    },
  });

  assert.equal(quote.source, "single_variant");
  assert.equal(quote.variantId, "only");
  assert.equal(quote.total, 602700);
});

test("resolveQueryQuoteTotal returns none when multiple variants and none confirmed", () => {
  const quote = resolveQueryQuoteTotal({
    variantPricingData: {
      a: { totalCost: 100000 },
      b: { totalCost: 200000 },
    },
  });

  assert.equal(quote.source, "none");
  assert.equal(quote.total, null);
  assert.equal(hasResolvedQueryQuoteTotal({
    variantPricingData: {
      a: { totalCost: 100000 },
      b: { totalCost: 200000 },
    },
  }), false);
});

test("resolveQueryQuoteTotal applies GST after fixed discount", () => {
  const quote = resolveQueryQuoteTotal({
    confirmedVariantId: "v1",
    variantPricingData: {
      v1: {
        totalCost: 95000,
        subtotalBeforeDiscount: 100000,
        appliedDiscount: {
          type: "fixed",
          inputValue: 5000,
          amount: 5000,
        },
      },
    },
  });

  // afterDiscount 95000 + GST 5% = 99750
  assert.equal(quote.total, 99750);
});

test("resolveQueryQuoteTotal keeps air fare GST-exempt on inclusive total", () => {
  const quote = resolveQueryQuoteTotal({
    confirmedVariantId: "v1",
    variantPricingData: {
      v1: {
        totalCost: 110000, // 100000 taxable + 10000 air
        subtotalBeforeDiscount: 100000,
        components: [
          { name: "Per Person Cost", price: 100000 },
          { name: "Air Fare", price: 10000 },
        ],
      },
    },
  });

  // taxable 100000 + GST 5000 + air 10000 = 115000
  assert.equal(quote.total, 115000);
});

test("hasResolvedQueryQuoteTotal is true for GST-inclusive positive totals", () => {
  assert.equal(
    hasResolvedQueryQuoteTotal({
      confirmedVariantId: "v1",
      variantPricingData: { v1: { totalCost: 574000 } },
    }),
    true
  );
});

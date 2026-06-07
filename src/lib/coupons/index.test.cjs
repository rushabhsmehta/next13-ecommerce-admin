const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs", moduleResolution: "node" },
});
require("tsconfig-paths").register({
  baseUrl: path.resolve(__dirname, "../../.."),
  paths: { "@/*": ["src/*"] },
});

const {
  calculateCouponDiscount,
  calculateDiscountedTaxAmounts,
  normalizeCouponCode,
} = require("./index");

test("normalizeCouponCode trims and uppercases valid codes", () => {
  assert.equal(normalizeCouponCode(" goa-10_summer "), "GOA-10_SUMMER");
});

test("normalizeCouponCode rejects unsafe characters", () => {
  assert.throws(
    () => normalizeCouponCode("GOA 10!"),
    (error) => error.name === "CouponError" && error.code === "INVALID_CODE_FORMAT"
  );
});

test("calculateCouponDiscount handles percent discounts with max cap", () => {
  assert.deepEqual(calculateCouponDiscount("PERCENT", 15, 100000, 10000), {
    discountAmount: 10000,
    taxableAmountAfterDiscount: 90000,
  });
});

test("calculateCouponDiscount handles fixed discounts without going negative", () => {
  assert.deepEqual(calculateCouponDiscount("FIXED", 5000, 3000), {
    discountAmount: 3000,
    taxableAmountAfterDiscount: 0,
  });
});

test("calculateDiscountedTaxAmounts recomputes GST on discounted taxable amount", () => {
  assert.deepEqual(
    calculateDiscountedTaxAmounts({
      originalSalePrice: 100000,
      taxableAmountAfterDiscount: 90000,
      gstPercentage: 5,
      isGst: true,
    }),
    {
      gstAmount: 4500,
      cgstAmount: 2250,
      sgstAmount: 2250,
      igstAmount: null,
    }
  );
});

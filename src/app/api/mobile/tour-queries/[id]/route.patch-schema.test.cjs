/**
 * PATCH body validation for mobile tour query edit (coercion for RN/JSON quirks).
 */
const { z } = require("zod");

const nullableText = z
  .union([z.string(), z.number()])
  .transform((value) => String(value))
  .nullable()
  .optional();
const pricingText = z
  .union([z.string(), z.number(), z.null()])
  .transform((value) => (value == null ? "" : String(value)))
  .optional();
const pricingItemSchema = z
  .object({
    name: pricingText,
    price: pricingText,
    description: pricingText,
    derivationFormula: pricingText,
  })
  .passthrough();
const roomAllocationSchema = z.object({
  id: z.string().optional(),
  roomTypeId: z.string().optional(),
  occupancyTypeId: z.string().optional(),
  mealPlanId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().min(0).optional(),
  customRoomType: z.string().optional().nullable(),
});

const patchSchema = z.object({
  totalPrice: nullableText,
  pricingSection: z.array(pricingItemSchema).optional().nullable(),
  pricingCalculationMethod: z.string().max(80).optional().nullable(),
  selectedMealPlanId: z.string().optional().nullable(),
  variantPricingData: z.record(z.any()).optional().nullable(),
  selectedVariantIds: z.array(z.string()).optional(),
  itineraries: z
    .array(
      z.object({
        id: z.string().optional(),
        dayNumber: z.coerce.number().int().optional(),
        days: z.coerce.string().optional(),
        locationId: z.string().optional(),
        hotelId: z.string().optional().nullable(),
        roomAllocations: z.array(roomAllocationSchema).optional(),
      })
    )
    .optional(),
});

function assert(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
}

const mobileLike = {
  selectedVariantIds: ["variant-a", "variant-b"],
  itineraries: [
    {
      id: "it-1",
      dayNumber: "1",
      days: 1,
      locationId: "loc-1",
      hotelId: null,
      roomAllocations: [
        {
          roomTypeId: "rt-1",
          occupancyTypeId: "occ-1",
          mealPlanId: null,
          quantity: "2",
          customRoomType: null,
        },
      ],
    },
  ],
};

const parsed = patchSchema.safeParse(mobileLike);
assert("mobile-like payload parses", parsed.success);
assert(
  "quantity coerced to number",
  parsed.data.itineraries[0].roomAllocations[0].quantity === 2
);
assert("dayNumber coerced", parsed.data.itineraries[0].dayNumber === 1);
assert("days coerced to string", parsed.data.itineraries[0].days === "1");

const badOccupancy = patchSchema.safeParse({
  itineraries: [
    {
      roomAllocations: [{ occupancyTypeId: "", quantity: 1 }],
    },
  ],
});
assert("empty occupancy string still parses", badOccupancy.success);

const missingOccupancyDropped = patchSchema.safeParse({
  itineraries: [
    {
      roomAllocations: [{ roomTypeId: "rt-1", quantity: 1 }],
    },
  ],
});
assert("missing occupancy parses (dropped on persist)", missingOccupancyDropped.success);
assert(
  "missing occupancy row has no occupancyTypeId",
  missingOccupancyDropped.data.itineraries[0].roomAllocations[0].occupancyTypeId == null ||
    missingOccupancyDropped.data.itineraries[0].roomAllocations[0].occupancyTypeId === undefined
);

const pricingPayload = patchSchema.safeParse({
  totalPrice: 50000,
  pricingCalculationMethod: "manual",
  selectedMealPlanId: null,
  pricingSection: [
    { name: "Adult", price: 25000, description: "25000 x 2", extra: "kept" },
  ],
  variantPricingData: { variantA: { totalCost: 50000 } },
});
assert("pricing payload parses", pricingPayload.success);
assert("totalPrice coerced to string", pricingPayload.data.totalPrice === "50000");
assert(
  "pricing component price coerced to string",
  pricingPayload.data.pricingSection[0].price === "25000"
);
assert(
  "pricing component passthrough survives",
  pricingPayload.data.pricingSection[0].extra === "kept"
);

console.log("route.patch-schema.test.cjs: all passed");

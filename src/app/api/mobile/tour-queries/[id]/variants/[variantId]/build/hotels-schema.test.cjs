/**
 * Build PATCH hotelsByItinerary shape (mirrors mobile variant build route).
 */
const { z } = require("zod");

const patchSchema = z.object({
  roomsByItinerary: z.record(z.array(z.any())).optional(),
  transportByItinerary: z.record(z.array(z.any())).optional(),
  hotelsByItinerary: z.record(z.string()).optional(),
});

function assert(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
}

const parsed = patchSchema.safeParse({
  hotelsByItinerary: {
    day1: "hotel-1",
    day2: "",
  },
  roomsByItinerary: {
    day1: [{ roomTypeId: "rt1" }],
  },
});

assert("build hotels payload parses", parsed.success);
assert("empty hotel id allowed", parsed.data.hotelsByItinerary.day2 === "");
assert("hotel id preserved", parsed.data.hotelsByItinerary.day1 === "hotel-1");

const bad = patchSchema.safeParse({
  hotelsByItinerary: { day1: 12 },
});
assert("non-string hotel id rejected", !bad.success);

console.log("variant-build.hotels-schema.test.cjs: all passed");

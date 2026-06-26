export const DEFAULT_PRICING_SECTION = [
  { name: "Per Person Cost", price: "", description: "", derivationFormula: "" },
  { name: "Per Couple Cost", price: "", description: "", derivationFormula: "" },
  { name: "Per Person With Extra Bed/Mattress", price: "", description: "", derivationFormula: "" },
  { name: "Child with Mattress (5 to 11)", price: "", description: "", derivationFormula: "" },
  { name: "Child without Mattress (5 to 11)", price: "", description: "", derivationFormula: "" },
  {
    name: "Child below 5 years (With Seat - Parents Sharing Bed)",
    price: "",
    description: "",
    derivationFormula: "",
  },
  {
    name: "Child below 5 years Without Seat (Parents Sharing Bed)",
    price: "",
    description: "",
    derivationFormula: "",
  },
  { name: "Air Fare", price: "", description: "", derivationFormula: "" },
];

export function cloneDefaultPricingSection() {
  return DEFAULT_PRICING_SECTION.map((item) => ({ ...item }));
}

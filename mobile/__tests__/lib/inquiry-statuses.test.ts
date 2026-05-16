import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_LABELS,
} from "../../lib/inquiry-statuses";

describe("inquiry-statuses", () => {
  it("has a label for every status", () => {
    for (const s of INQUIRY_STATUSES) {
      expect(INQUIRY_STATUS_LABELS[s].length).toBeGreaterThan(0);
    }
  });
});

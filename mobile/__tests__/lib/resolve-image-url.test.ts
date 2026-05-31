import { resolveImageUrl } from "../../lib/resolve-image-url";

describe("resolveImageUrl", () => {
  it("returns null for empty input", () => {
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl("  ")).toBeNull();
  });

  it("prefixes relative admin paths", () => {
    expect(resolveImageUrl("/uploads/foo.jpg")).toBe(
      "https://admin.aagamholidays.com/uploads/foo.jpg"
    );
  });

  it("converts cloudinary avif to jpg transform", () => {
    expect(
      resolveImageUrl(
        "https://res.cloudinary.com/ds9giziht/image/upload/v1/sample.avif"
      )
    ).toBe(
      "https://res.cloudinary.com/ds9giziht/image/upload/f_jpg,q_auto/v1/sample.avif"
    );
  });

  it("adds q_auto to cloudinary jpeg without touching existing transforms", () => {
    expect(
      resolveImageUrl(
        "https://res.cloudinary.com/ds9giziht/image/upload/v1/sample.jpg"
      )
    ).toBe(
      "https://res.cloudinary.com/ds9giziht/image/upload/q_auto/v1/sample.jpg"
    );
  });

  it("leaves pre-transformed cloudinary urls unchanged", () => {
    const url =
      "https://res.cloudinary.com/ds9giziht/image/upload/f_auto,q_auto/v1/sample.jpg";
    expect(resolveImageUrl(url)).toBe(url);
  });
});

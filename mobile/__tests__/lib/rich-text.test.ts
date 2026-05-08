import {
  stripHtml,
  extractPlainText,
  extractPlainTextLines,
  splitPackageName,
  extractDistanceDuration,
  toTitleCase,
} from "@/lib/rich-text";

describe("stripHtml", () => {
  it("removes plain HTML tags", () => {
    expect(stripHtml("<p>Hello world</p>")).toBe("Hello world");
  });

  it("decodes entities", () => {
    expect(stripHtml("Rivers &amp; Valleys")).toBe("Rivers & Valleys");
    expect(stripHtml("It&#39;s great")).toBe("It's great");
    expect(stripHtml("&quot;quoted&quot;")).toBe('"quoted"');
  });

  it("handles ProseMirror data attributes", () => {
    const input =
      '<p data-start="206" data-end="467">Arrive in Srinagar.</p><p data-start="469"><br></p>';
    expect(stripHtml(input)).toBe("Arrive in Srinagar.");
  });

  it("collapses whitespace and preserves paragraph breaks", () => {
    const input = "<p>One</p><p>Two</p>";
    expect(stripHtml(input)).toBe("One\n\nTwo");
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
    expect(stripHtml("")).toBe("");
  });
});

describe("extractPlainText", () => {
  it("walks ProseMirror doc nodes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Day 1 — Arrival" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Welcome dinner" }],
        },
      ],
    };
    expect(extractPlainText(doc)).toBe("Day 1 — Arrival\n\nWelcome dinner");
  });

  it("parses JSON strings", () => {
    const json = JSON.stringify({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "From JSON" }] },
      ],
    });
    expect(extractPlainText(json)).toBe("From JSON");
  });

  it("handles arrays of plain strings", () => {
    expect(extractPlainText(["one", "two"])).toBe("one\n\ntwo");
  });

  it("strips HTML on string input", () => {
    expect(extractPlainText("<p>hello</p>")).toBe("hello");
  });

  it("returns empty for null", () => {
    expect(extractPlainText(null)).toBe("");
    expect(extractPlainText(undefined)).toBe("");
  });
});

describe("extractPlainTextLines", () => {
  it("splits on paragraph breaks and drops empties", () => {
    expect(extractPlainTextLines("<p>one</p><p>two</p><p></p>")).toEqual([
      "one",
      "two",
    ]);
  });
});

describe("toTitleCase", () => {
  it("converts all-caps", () => {
    expect(toTitleCase("KASHMIR LADAKH")).toBe("Kashmir Ladakh");
  });
  it("preserves mixed case", () => {
    expect(toTitleCase("iPhone Pro")).toBe("iPhone Pro");
  });
  it("handles dashes", () => {
    expect(toTitleCase("ROYAL NORTH-INDIA")).toBe("Royal North-India");
  });
});

describe("splitPackageName", () => {
  it("parses pipe-separated names", () => {
    const parts = splitPackageName(
      "KASHMIR LADAKH | 13N-14D | ROYAL NORTH INDIA ODYSSEY | SRINAGAR – KARGIL – LEH – NUBRA – SONMARG – GULMARG – PAHALGAM"
    );
    expect(parts.title).toBe("Kashmir Ladakh");
    expect(parts.subtitle).toBe("Royal North India Odyssey");
    expect(parts.duration).toMatch(/13N-14D/i);
    expect(parts.route).toContain("SRINAGAR");
  });

  it("returns single title when no pipes", () => {
    expect(splitPackageName("Goa Honeymoon Package").title).toBe(
      "Goa Honeymoon Package"
    );
  });

  it("handles empty input", () => {
    expect(splitPackageName("").title).toBe("");
    expect(splitPackageName(null).title).toBe("");
  });
});

describe("extractDistanceDuration", () => {
  it("strips trailing distance/duration parenthesis", () => {
    const result = extractDistanceDuration(
      "Kargil to Sonmarg – Meadows Return (130 Km / 5-6 Hrs)"
    );
    expect(result.cleanedTitle).toBe("Kargil to Sonmarg – Meadows Return");
    expect(result.distance).toMatch(/130\s*Km/i);
    expect(result.duration).toMatch(/5-6\s*Hrs/i);
  });

  it("leaves title alone if no parenthesis", () => {
    const result = extractDistanceDuration("Local Sightseeing");
    expect(result.cleanedTitle).toBe("Local Sightseeing");
    expect(result.distance).toBeUndefined();
    expect(result.duration).toBeUndefined();
  });

  it("handles HTML wrapper around the title", () => {
    const result = extractDistanceDuration(
      "<p>Pahalgam to Srinagar – Farewell Drive (90 Km / 3 Hrs)</p>"
    );
    expect(result.cleanedTitle).toBe("Pahalgam to Srinagar – Farewell Drive");
    expect(result.distance).toMatch(/90\s*Km/i);
    expect(result.duration).toMatch(/3\s*Hrs/i);
  });
});

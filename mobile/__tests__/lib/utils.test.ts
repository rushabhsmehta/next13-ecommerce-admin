import { relativeTime, formatDateRange, lastMessagePreview, formatPrice, formatTime, getInitials } from "../lib/utils";

describe("relativeTime", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-04T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'Now' for times less than 60 seconds ago", () => {
    const result = relativeTime(new Date(Date.now() - 30 * 1000).toISOString());
    expect(result).toBe("Now");
  });

  it("returns minutes for times less than 60 minutes ago", () => {
    const result = relativeTime(new Date(Date.now() - 5 * 60 * 1000).toISOString());
    expect(result).toBe("5m");
  });

  it("returns hours for times less than 24 hours ago", () => {
    const result = relativeTime(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString());
    expect(result).toBe("3h");
  });

  it("returns days for times less than 7 days ago", () => {
    const result = relativeTime(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());
    expect(result).toBe("2d");
  });

  it("returns formatted date for times older than 7 days", () => {
    const result = relativeTime(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString());
    expect(result).toMatch(/\d{1,2}\s[a-zA-Z]{3}/);
  });
});

describe("formatDateRange", () => {
  it("returns empty string when both start and end are null", () => {
    expect(formatDateRange(null, null)).toBe("");
  });

  it("returns 'From <date>' when only start is provided", () => {
    const result = formatDateRange("2026-05-15", null);
    expect(result).toBe("From 15 May 2026");
  });

  it("returns 'Until <date>' when only end is provided", () => {
    const result = formatDateRange(null, "2026-05-20");
    expect(result).toBe("Until 20 May 2026");
  });

  it("returns '<start> – <end>' when both dates are provided", () => {
    const result = formatDateRange("2026-05-15", "2026-05-20");
    expect(result).toBe("15 May 2026 – 20 May 2026");
  });
});

describe("lastMessagePreview", () => {
  it("returns 'No messages yet' for null message", () => {
    expect(lastMessagePreview(null)).toBe("No messages yet");
  });

  it("returns emoji + type for non-TEXT messages", () => {
    const msg = { content: null, messageType: "IMAGE", sender: null };
    expect(lastMessagePreview(msg)).toBe("📎 Image");
  });

  it("returns content preview with sender name for TEXT messages", () => {
    const msg = {
      content: "Hello world",
      messageType: "TEXT",
      sender: { name: "Priya Sharma" },
    };
    expect(lastMessagePreview(msg)).toBe("Priya: Hello world");
  });

  it("truncates long messages to 42 characters", () => {
    const msg = {
      content: "This is a very long message that exceeds the maximum allowed length",
      messageType: "TEXT",
      sender: { name: "Priya Sharma" },
    };
    const result = lastMessagePreview(msg);
    expect(result.length).toBe(43); // 42 + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("handles messages without sender", () => {
    const msg = {
      content: "Hello",
      messageType: "TEXT",
      sender: null,
    };
    expect(lastMessagePreview(msg)).toBe("Hello");
  });

  it("handles null content with sender", () => {
    const msg = {
      content: null,
      messageType: "TEXT",
      sender: { name: "Priya" },
    };
    expect(lastMessagePreview(msg)).toBe("Priya: ");
  });
});

describe("formatPrice", () => {
  it("returns null for null value", () => {
    expect(formatPrice(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(formatPrice(undefined)).toBeNull();
  });

  it("formats string price correctly", () => {
    expect(formatPrice("5000")).toBe("₹5,000");
  });

  it("formats number price correctly", () => {
    expect(formatPrice(10000)).toBe("₹10,000");
  });

  it("handles large numbers", () => {
    expect(formatPrice("150000")).toBe("₹1,50,000");
  });
});

describe("formatTime", () => {
  it("formats time in IST format", () => {
    const result = formatTime("2026-05-04T14:30:00.000Z");
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });
});

describe("getInitials", () => {
  it("returns first letter of single word name", () => {
    expect(getInitials("Priya")).toBe("P");
  });

  it("returns first letter of first two words", () => {
    expect(getInitials("Priya Sharma")).toBe("PS");
  });

  it("returns first two letters of multi-word name", () => {
    expect(getInitials("Priya Sharma Gupta")).toBe("PS");
  });

  it("handles lowercase names", () => {
    expect(getInitials("priya")).toBe("P");
  });

  it("handles empty string", () => {
    expect(getInitials("")).toBe("");
  });
});

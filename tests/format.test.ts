import { describe, expect, it } from "vitest";
import { escapeCsvCell, formatBytes, toPercent } from "../src/format.js";

describe("formatBytes", () => {
  it("formats bytes using binary units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(1536)).toBe("1.50 KB");
    expect(formatBytes(1048576)).toBe("1.00 MB");
  });
});

describe("toPercent", () => {
  it("formats percentages with two decimals", () => {
    expect(toPercent(25, 100)).toBe("25.00%");
    expect(toPercent(0, 0)).toBe("0.00%");
  });
});

describe("escapeCsvCell", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvCell("plain")).toBe("plain");
    expect(escapeCsvCell("a,b")).toBe("\"a,b\"");
    expect(escapeCsvCell("a\"b")).toBe("\"a\"\"b\"");
    expect(escapeCsvCell("a\nb")).toBe("\"a\nb\"");
  });
});

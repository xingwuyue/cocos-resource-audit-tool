import { describe, expect, it } from "vitest";
import { version } from "../src/index";

describe("package smoke", () => {
  it("exports a version string", () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

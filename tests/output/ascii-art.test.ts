import { getArt, getHeaderArt } from "../../src/output/ascii-art.js";
import type { Severity } from "../../src/types.js";

describe("getArt", () => {
  it("critical: artが10行以上でcommentが空でない", () => {
    const result = getArt("critical");
    expect(result).toBeDefined();
    expect(result.art.split("\n").length).toBeGreaterThanOrEqual(10);
    expect(result.comment.length).toBeGreaterThan(0);
    expect(result.label.length).toBeGreaterThan(0);
  });

  it("high: artが10行以上でcommentが空でない", () => {
    const result = getArt("high");
    expect(result).toBeDefined();
    expect(result.art.split("\n").length).toBeGreaterThanOrEqual(10);
    expect(result.comment.length).toBeGreaterThan(0);
    expect(result.label.length).toBeGreaterThan(0);
  });

  it("medium: artが10行以上でcommentが空でない", () => {
    const result = getArt("medium");
    expect(result).toBeDefined();
    expect(result.art.split("\n").length).toBeGreaterThanOrEqual(10);
    expect(result.comment.length).toBeGreaterThan(0);
    expect(result.label.length).toBeGreaterThan(0);
  });

  it("low: artが10行以上でcommentが空でない", () => {
    const result = getArt("low");
    expect(result).toBeDefined();
    expect(result.art.split("\n").length).toBeGreaterThanOrEqual(10);
    expect(result.comment.length).toBeGreaterThan(0);
    expect(result.label.length).toBeGreaterThan(0);
  });

  it("全severityに対してundefinedでない", () => {
    const severities: Severity[] = ["low", "medium", "high", "critical"];
    for (const severity of severities) {
      const result = getArt(severity);
      expect(result).not.toBeUndefined();
      expect(result.art).toBeDefined();
      expect(result.comment).toBeDefined();
      expect(result.label).toBeDefined();
    }
  });
});

describe("getHeaderArt", () => {
  it("空でない", () => {
    const header = getHeaderArt();
    expect(header.length).toBeGreaterThan(0);
  });

  it("複数行である", () => {
    const header = getHeaderArt();
    expect(header.split("\n").length).toBeGreaterThan(1);
  });
});

import { describe, it, expect } from "vitest";
import { scoreToGrade, computeScore } from "../../src/utils/severity.js";

describe("scoreToGrade", () => {
  it("100はAを返す", () => {
    expect(scoreToGrade(100)).toBe("A");
  });
  it("90はAを返す", () => {
    expect(scoreToGrade(90)).toBe("A");
  });
  it("89はBを返す", () => {
    expect(scoreToGrade(89)).toBe("B");
  });
  it("80はBを返す", () => {
    expect(scoreToGrade(80)).toBe("B");
  });
  it("79はCを返す", () => {
    expect(scoreToGrade(79)).toBe("C");
  });
  it("70はCを返す", () => {
    expect(scoreToGrade(70)).toBe("C");
  });
  it("69はDを返す", () => {
    expect(scoreToGrade(69)).toBe("D");
  });
  it("60はDを返す", () => {
    expect(scoreToGrade(60)).toBe("D");
  });
  it("59はFを返す", () => {
    expect(scoreToGrade(59)).toBe("F");
  });
  it("0はFを返す", () => {
    expect(scoreToGrade(0)).toBe("F");
  });
});

describe("computeScore", () => {
  it("チェックが空の場合は100を返す", () => {
    expect(computeScore([])).toBe(100);
  });
});

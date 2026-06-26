import { describe, it, expect } from "vitest";
import { parseIsoDuration } from "./duration";

describe("parseIsoDuration", () => {
  it.each([
    ["PT45S", 45],
    ["PT12M34S", 754],
    ["PT1H2M3S", 3723],
    ["PT2H", 7200],
    ["PT20M", 1200],
    ["PT1H30M", 5400],
    ["P0D", 0],
    ["", 0],
    ["亂碼", 0],
  ])("%s → %i 秒", (iso, expected) => {
    expect(parseIsoDuration(iso)).toBe(expected);
  });
});

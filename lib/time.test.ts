import { describe, it, expect } from "vitest";
import { formatTimestamp } from "./time";

describe("formatTimestamp", () => {
  it.each([
    [0, "00:00"],
    [9, "00:09"],
    [75, "01:15"],
    [600, "10:00"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3661, "1:01:01"],
    [-5, "00:00"],
    [12.9, "00:12"],
  ])("%i 秒 → %s", (input, expected) => {
    expect(formatTimestamp(input)).toBe(expected);
  });
});

import { describe, it, expect } from "vitest";
import { normalizeSegments } from "./transcript";

describe("normalizeSegments", () => {
  it("過濾空白片段並去除前後空格", () => {
    const out = normalizeSegments([
      { text: "  hello  ", offset: 0 },
      { text: "", offset: 1 },
      { text: "  ", offset: 2 },
      { text: "world", offset: 3 },
    ]);
    expect(out).toEqual([
      { text: "hello", start: 0 },
      { text: "world", start: 3 },
    ]);
  });

  it("classic 格式（秒）維持原值", () => {
    const out = normalizeSegments([
      { text: "a", offset: 0 },
      { text: "b", offset: 2.5 },
      { text: "c", offset: 5.1 },
      { text: "d", offset: 7.8 },
    ]);
    expect(out.map((s) => s.start)).toEqual([0, 2.5, 5.1, 7.8]);
  });

  it("srv3 格式（毫秒）轉換成秒", () => {
    const out = normalizeSegments([
      { text: "a", offset: 0 },
      { text: "b", offset: 2000 },
      { text: "c", offset: 5000 },
      { text: "d", offset: 8000 },
    ]);
    expect(out.map((s) => s.start)).toEqual([0, 2, 5, 8]);
  });

  it("少於兩個片段時不做單位推斷", () => {
    const out = normalizeSegments([{ text: "only", offset: 3000 }]);
    expect(out).toEqual([{ text: "only", start: 3000 }]);
  });
});

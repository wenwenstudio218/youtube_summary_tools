import { describe, it, expect } from "vitest";
import { stripMarkdown } from "./text";

describe("stripMarkdown", () => {
  it("移除粗體 **x** 與 __x__", () => {
    expect(stripMarkdown("這是**重點**與__強調__")).toBe("這是重點與強調");
  });
  it("移除行內程式碼", () => {
    expect(stripMarkdown("用 `npm test` 執行")).toBe("用 npm test 執行");
  });
  it("移除標題符號", () => {
    expect(stripMarkdown("## 標題\n內文")).toBe("標題\n內文");
  });
  it("純文字不變", () => {
    expect(stripMarkdown("1. 田貫湖 - 位於富士山西邊")).toBe(
      "1. 田貫湖 - 位於富士山西邊",
    );
  });
});

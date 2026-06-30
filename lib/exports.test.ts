import { describe, it, expect } from "vitest";
import { summaryToHtml } from "./exports";
import type { Summary } from "./types";

const summary: Summary = {
  videoId: "dQw4w9WgXcQ",
  metadata: {
    videoId: "dQw4w9WgXcQ",
    title: "範例 <影片>",
    channel: "範例頻道",
    thumbnail: "",
  },
  short: [{ point: "重點一", timestamp: 75 }],
  long: [{ point: "詳細重點", timestamp: 12 }],
};

describe("summaryToHtml", () => {
  it("含標題、頻道、時間戳與重點", () => {
    const html = summaryToHtml(summary, "short");
    expect(html).toContain("<h1>範例 &lt;影片&gt;</h1>"); // 標題經 HTML escape
    expect(html).toContain("頻道：範例頻道");
    expect(html).toContain("[01:15]");
    expect(html).toContain("重點一");
    expect(html).toContain("重點摘要（短版）");
  });

  it("長版使用 long 重點", () => {
    const html = summaryToHtml(summary, "long");
    expect(html).toContain("詳細重點");
    expect(html).toContain("[00:12]");
    expect(html).not.toContain("重點一");
  });
});

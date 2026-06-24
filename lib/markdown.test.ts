import { describe, it, expect } from "vitest";
import { summaryToMarkdown } from "./markdown";
import type { Summary } from "./types";

const summary: Summary = {
  videoId: "dQw4w9WgXcQ",
  metadata: {
    videoId: "dQw4w9WgXcQ",
    title: "範例影片",
    channel: "範例頻道",
    thumbnail: "https://img/thumb.jpg",
  },
  short: [
    { point: "重點一", timestamp: 75 },
    { point: "重點二", timestamp: 3661 },
  ],
  long: [{ point: "詳細重點", timestamp: 12 }],
};

describe("summaryToMarkdown", () => {
  it("短版輸出含標題、頻道、時間戳連結", () => {
    const md = summaryToMarkdown(summary, "short");
    expect(md).toContain("# 範例影片");
    expect(md).toContain("- 頻道：範例頻道");
    expect(md).toContain("重點摘要（短版）");
    expect(md).toContain(
      "- [01:15](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=75s) 重點一",
    );
    expect(md).toContain(
      "- [1:01:01](https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3661s) 重點二",
    );
  });

  it("長版使用 long 的重點", () => {
    const md = summaryToMarkdown(summary, "long");
    expect(md).toContain("重點摘要（長版）");
    expect(md).toContain("詳細重點");
    expect(md).not.toContain("重點一");
  });
});

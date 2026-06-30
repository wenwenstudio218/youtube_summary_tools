import { describe, it, expect, vi } from "vitest";
import { summarize, mockSummary } from "./summarize";
import type { TranscriptSegment, VideoMetadata } from "./types";

const metadata: VideoMetadata = {
  videoId: "dQw4w9WgXcQ",
  title: "測試影片",
  channel: "測試頻道",
  thumbnail: "https://img/thumb.jpg",
};

const segments: TranscriptSegment[] = Array.from({ length: 12 }, (_, i) => ({
  text: `片段 ${i}`,
  start: i * 10,
}));

describe("mockSummary", () => {
  it("短版 3 點、長版 6 點，時間戳取自字幕", () => {
    const s = mockSummary(metadata, segments);
    expect(s.short).toHaveLength(3);
    expect(s.long).toHaveLength(6);
    for (const b of [...s.short, ...s.long]) {
      expect(segments.some((seg) => seg.start === b.timestamp)).toBe(true);
    }
  });

  it("片段少於目標數時不超出可用片段", () => {
    const s = mockSummary(metadata, segments.slice(0, 2));
    expect(s.short).toHaveLength(2);
    expect(s.long).toHaveLength(2);
  });
});

describe("summarize", () => {
  it("預設 mock 模式回傳假摘要", async () => {
    const s = await summarize(metadata, segments, { mode: "mock" });
    expect(s.videoId).toBe("dQw4w9WgXcQ");
    expect(s.short.length).toBeGreaterThan(0);
  });

  it("live 模式呼叫注入的 client 並解析 JSON", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                short: [{ point: "重點", timestamp: 30 }],
                long: [
                  { point: "詳點一", timestamp: 10 },
                  { point: "詳點二", timestamp: 50 },
                ],
              }),
            },
          ],
        }),
      },
    };

    const s = await summarize(metadata, segments, {
      mode: "live",
      client: fakeClient as never,
    });

    expect(fakeClient.messages.create).toHaveBeenCalledOnce();
    expect(s.short).toEqual([{ point: "重點", timestamp: 30 }]);
    expect(s.long).toHaveLength(2);
  });

  it("輸出依時間戳由小到大排序（不論 Claude 回傳順序）", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                short: [
                  { point: "後", timestamp: 120 },
                  { point: "前", timestamp: 10 },
                  { point: "中", timestamp: 60 },
                ],
                long: [
                  { point: "b", timestamp: 90 },
                  { point: "a", timestamp: 30 },
                ],
              }),
            },
          ],
        }),
      },
    };
    const s = await summarize(metadata, segments, {
      mode: "live",
      client: fakeClient as never,
    });
    expect(s.short.map((b) => b.timestamp)).toEqual([10, 60, 120]);
    expect(s.long.map((b) => b.timestamp)).toEqual([30, 90]);
  });

  it("live 模式回應非 JSON 時拋出 SUMMARIZE_FAILED", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "not json" }],
        }),
      },
    };
    await expect(
      summarize(metadata, segments, { mode: "live", client: fakeClient as never }),
    ).rejects.toMatchObject({ code: "SUMMARIZE_FAILED" });
  });
});

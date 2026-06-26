import { describe, it, expect, vi } from "vitest";
import { buildSearchListParams, searchVideos, mockSearch } from "./search";
import type { SearchFilters } from "./types";

const base: SearchFilters = { order: "relevance", uploaded: "any", length: "any" };

describe("buildSearchListParams", () => {
  it("基本參數：type=video、maxResults=12、q、order", () => {
    const p = buildSearchListParams("react 教學", base, undefined);
    expect(p.get("type")).toBe("video");
    expect(p.get("maxResults")).toBe("12");
    expect(p.get("q")).toBe("react 教學");
    expect(p.get("order")).toBe("relevance");
    expect(p.get("videoDuration")).toBeNull();
    expect(p.get("publishedAfter")).toBeNull();
  });

  it("length/uploaded 為 any 時不帶該參數", () => {
    const p = buildSearchListParams("x", { ...base, length: "any", uploaded: "any" }, undefined);
    expect(p.has("videoDuration")).toBe(false);
    expect(p.has("publishedAfter")).toBe(false);
  });

  it("length 帶入 videoDuration", () => {
    const p = buildSearchListParams("x", { ...base, length: "short" }, undefined);
    expect(p.get("videoDuration")).toBe("short");
  });

  it("uploaded 依 now 計算 publishedAfter", () => {
    const now = Date.UTC(2026, 0, 8); // 2026-01-08
    const p = buildSearchListParams("x", { ...base, uploaded: "week" }, undefined, now);
    expect(p.get("publishedAfter")).toBe(new Date(Date.UTC(2026, 0, 1)).toISOString());
  });

  it("帶入 pageToken", () => {
    const p = buildSearchListParams("x", base, "tok123");
    expect(p.get("pageToken")).toBe("tok123");
  });
});

describe("mockSearch", () => {
  it("第一頁回 12 筆且有 nextPageToken", () => {
    const r = mockSearch("test", undefined);
    expect(r.items).toHaveLength(12);
    expect(r.nextPageToken).toBe("page2");
    expect(r.items[0].title).toContain("test");
  });

  it("第二頁無 nextPageToken", () => {
    const r = mockSearch("test", "page2");
    expect(r.nextPageToken).toBeUndefined();
  });
});

describe("searchVideos (live)", () => {
  function jsonResponse(data: unknown): Response {
    return { ok: true, status: 200, json: async () => data } as Response;
  }

  it("合併 search.list 與 videos.list 成卡片", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: { videoId: "abc12345678" },
              snippet: {
                title: "影片一",
                channelTitle: "頻道一",
                thumbnails: { medium: { url: "http://t/1.jpg" } },
              },
            },
          ],
          nextPageToken: "next",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: "abc12345678", contentDetails: { duration: "PT12M34S" } }],
        }),
      );

    const r = await searchVideos("q", base, undefined, {
      mode: "live",
      apiKey: "KEY",
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    expect(r.items).toEqual([
      {
        videoId: "abc12345678",
        title: "影片一",
        channel: "頻道一",
        thumbnail: "http://t/1.jpg",
        duration: 754,
      },
    ]);
    expect(r.nextPageToken).toBe("next");
  });

  it("403 quotaExceeded 拋出 QUOTA_EXCEEDED", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => '{"error":{"errors":[{"reason":"quotaExceeded"}]}}',
    });
    await expect(
      searchVideos("q", base, undefined, {
        mode: "live",
        apiKey: "KEY",
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" });
  });
});

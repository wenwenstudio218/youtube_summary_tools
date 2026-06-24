import { describe, it, expect, vi } from "vitest";
import { extractVideoId, fetchMetadata } from "./youtube";
import { AppError } from "./errors";

describe("extractVideoId", () => {
  const ID = "dQw4w9WgXcQ";

  it.each([
    [`https://www.youtube.com/watch?v=${ID}`, ID],
    [`https://youtube.com/watch?v=${ID}&t=42s`, ID],
    [`https://m.youtube.com/watch?v=${ID}`, ID],
    [`https://youtu.be/${ID}`, ID],
    [`https://youtu.be/${ID}?t=10`, ID],
    [`https://www.youtube.com/shorts/${ID}`, ID],
    [`https://www.youtube.com/embed/${ID}`, ID],
    [`https://www.youtube.com/live/${ID}`, ID],
    [`https://www.youtube-nocookie.com/embed/${ID}`, ID],
    [ID, ID],
    [`  ${ID}  `, ID],
  ])("解析 %s", (input, expected) => {
    expect(extractVideoId(input)).toBe(expected);
  });

  it.each([
    "",
    "not a url",
    "https://example.com/watch?v=abc",
    "https://www.youtube.com/watch?v=tooShort",
    "https://vimeo.com/12345",
  ])("無效輸入回傳 null：%s", (input) => {
    expect(extractVideoId(input)).toBeNull();
  });
});

describe("fetchMetadata", () => {
  it("成功時回傳標題、頻道、縮圖", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        title: "測試影片",
        author_name: "測試頻道",
        thumbnail_url: "https://img/thumb.jpg",
      }),
    });

    const meta = await fetchMetadata("dQw4w9WgXcQ", fakeFetch as unknown as typeof fetch);
    expect(meta).toEqual({
      videoId: "dQw4w9WgXcQ",
      title: "測試影片",
      channel: "測試頻道",
      thumbnail: "https://img/thumb.jpg",
    });
  });

  it("404 時拋出 VIDEO_UNAVAILABLE", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(
      fetchMetadata("dQw4w9WgXcQ", fakeFetch as unknown as typeof fetch),
    ).rejects.toMatchObject({ code: "VIDEO_UNAVAILABLE" } as Partial<AppError>);
  });

  it("其他錯誤碼拋出 METADATA_FAILED", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(
      fetchMetadata("dQw4w9WgXcQ", fakeFetch as unknown as typeof fetch),
    ).rejects.toMatchObject({ code: "METADATA_FAILED" });
  });
});

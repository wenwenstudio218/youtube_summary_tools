import { describe, it, expect, vi } from "vitest";
import { normalizeSegments, fetchViaSupadata, fetchTranscript } from "./transcript";

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

function okJson(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as Response;
}

describe("fetchViaSupadata", () => {
  it("解析 content 並將 offset(毫秒) 轉成秒", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okJson({
        content: [
          { text: "結果行程不知道怎麼排", offset: 1768, duration: 1902 },
          { text: " A 不想走太多路 ", offset: 3670, duration: 1435 },
          { text: "", offset: 5000 },
        ],
      }),
    );
    const segs = await fetchViaSupadata("abc", "KEY", fetchFn as unknown as typeof fetch);
    expect(segs).toEqual([
      { text: "結果行程不知道怎麼排", start: 1.768 },
      { text: "A 不想走太多路", start: 3.67 },
    ]);
    // 帶上 x-api-key header
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ headers: { "x-api-key": "KEY" } });
  });

  it("404 拋出 NO_TRANSCRIPT", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(
      fetchViaSupadata("abc", "KEY", fetchFn as unknown as typeof fetch),
    ).rejects.toMatchObject({ code: "NO_TRANSCRIPT" });
  });

  it("content 為空拋出 NO_TRANSCRIPT", async () => {
    const fetchFn = vi.fn().mockResolvedValue(okJson({ content: [] }));
    await expect(
      fetchViaSupadata("abc", "KEY", fetchFn as unknown as typeof fetch),
    ).rejects.toMatchObject({ code: "NO_TRANSCRIPT" });
  });
});

describe("fetchTranscript", () => {
  it("有 Supadata 金鑰時優先使用 Supadata", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      okJson({ content: [{ text: "哈囉", offset: 1000 }] }),
    );
    const segs = await fetchTranscript("abc", {
      supadataKey: "KEY",
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(segs).toEqual([{ text: "哈囉", start: 1 }]);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("Supadata 回報無字幕時直接拋出，不回退", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(
      fetchTranscript("abc", {
        supadataKey: "KEY",
        fetchFn: fetchFn as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "NO_TRANSCRIPT" });
  });
});

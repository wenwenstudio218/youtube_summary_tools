import { describe, it, expect, vi } from "vitest";
import { ask, mockAnswer } from "./ask";
import type { AskHistoryItem, TranscriptSegment } from "./types";

const segments: TranscriptSegment[] = [
  { text: "歡迎收看本片", start: 0 },
  { text: "今天談 React 效能", start: 12 },
  { text: "記得訂閱頻道", start: 30 },
];

describe("mockAnswer", () => {
  it("回傳含問題的假回答與最多兩個引用", () => {
    const r = mockAnswer(segments, "影片在講什麼？");
    expect(r.answer).toContain("影片在講什麼？");
    expect(r.citations).toHaveLength(2);
    expect(r.citations[0].timestamp).toBe(0);
  });
});

describe("ask", () => {
  it("預設 mock 模式回傳假回答", async () => {
    const r = await ask(segments, "重點是什麼？", [], { mode: "mock" });
    expect(r.answer.length).toBeGreaterThan(0);
  });

  it("live 模式組裝 history + 新問題並解析 JSON", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            answer: "影片在談 React 效能優化。",
            citations: [{ point: "談 React 效能", timestamp: 12 }],
          }),
        },
      ],
    });
    const fakeClient = { messages: { create } };

    const history: AskHistoryItem[] = [
      { role: "user", text: "這部影片的主題？" },
      { role: "assistant", text: "關於前端開發。" },
    ];

    const r = await ask(segments, "具體在講什麼？", history, {
      mode: "live",
      client: fakeClient as never,
    });

    expect(r.answer).toContain("React");
    expect(r.citations[0].timestamp).toBe(12);

    // 驗證送出的 messages = 歷史 + 新問題，且以 user 結尾
    const sent = create.mock.calls[0][0];
    expect(sent.messages).toHaveLength(3);
    expect(sent.messages[0]).toEqual({ role: "user", content: "這部影片的主題？" });
    expect(sent.messages[2]).toEqual({ role: "user", content: "具體在講什麼？" });
  });

  it("live 模式回應非 JSON 時拋出 SUMMARIZE_FAILED", async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "壞掉的回應" }],
        }),
      },
    };
    await expect(
      ask(segments, "問題", [], { mode: "live", client: fakeClient as never }),
    ).rejects.toMatchObject({ code: "SUMMARIZE_FAILED" });
  });
});

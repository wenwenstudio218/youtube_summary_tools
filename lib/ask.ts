import Anthropic from "@anthropic-ai/sdk";
import { AppError, ErrorCodes } from "./errors";
import type { AskHistoryItem, AskResult, TranscriptSegment } from "./types";

export type AskOptions = {
  /** "mock"（預設）回傳假回答；"live" 呼叫 Claude API */
  mode?: string;
  apiKey?: string;
  model?: string;
  /** 可注入用於測試 */
  client?: Pick<Anthropic, "messages">;
};

const DEFAULT_MODEL = "claude-haiku-4-5";

/**
 * 針對影片逐字稿回答單一問題（多輪：帶入先前對話歷史）。
 * 依 mode 決定走 mock 或真實 Claude API。
 */
export async function ask(
  segments: TranscriptSegment[],
  question: string,
  history: AskHistoryItem[],
  options: AskOptions = {},
): Promise<AskResult> {
  const mode = options.mode ?? process.env.SUMMARIZE_MODE ?? "mock";
  if (mode !== "live") {
    return mockAnswer(segments, question);
  }
  return liveAnswer(segments, question, history, options);
}

/** 開發期假回答：回一句固定回應，引用前兩個字幕片段的時間戳 */
export function mockAnswer(
  segments: TranscriptSegment[],
  question: string,
): AskResult {
  const citations = segments.slice(0, 2).map((seg) => ({
    point: seg.text.slice(0, 40),
    timestamp: seg.start,
  }));
  return {
    answer: `（範例回答）你問的是「${question}」。實際接上 Claude 後，這裡會根據逐字稿回答並標註相關時間戳。`,
    citations,
  };
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          point: { type: "string" },
          timestamp: { type: "number" },
        },
        required: ["point", "timestamp"],
        additionalProperties: false,
      },
    },
  },
  required: ["answer", "citations"],
  additionalProperties: false,
} as const;

function buildTranscriptText(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${Math.floor(s.start)}s] ${s.text}`).join("\n");
}

async function liveAnswer(
  segments: TranscriptSegment[],
  question: string,
  history: AskHistoryItem[],
  options: AskOptions,
): Promise<AskResult> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !options.client) {
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, "尚未設定 ANTHROPIC_API_KEY");
  }
  const model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const client = options.client ?? new Anthropic({ apiKey });

  const system =
    "你是影片內容問答助手。只根據提供的逐字稿回答使用者問題，一律使用繁體中文。" +
    "若逐字稿沒有相關內容，誠實說明影片未提及，不要編造。" +
    "在 citations 附上與回答最相關的時間戳（秒，整數，取自逐字稿的 [Ns] 標記）；" +
    "若無明確對應片段，citations 可為空陣列。\n\n逐字稿：\n" +
    buildTranscriptText(segments);

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.text })),
    { role: "user" as const, content: question },
  ];

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 4096,
      system,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, `回答生成失敗：${msg}`);
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, "回答格式異常");
  }

  let parsed: AskResult;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, "回答無法解析");
  }

  return {
    answer: parsed.answer ?? "",
    citations: parsed.citations ?? [],
  };
}

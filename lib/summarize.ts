import Anthropic from "@anthropic-ai/sdk";
import { AppError, ErrorCodes } from "./errors";
import { formatTimestamp } from "./time";
import type { Bullet, Summary, TranscriptSegment, VideoMetadata } from "./types";

export type SummarizeOptions = {
  /** "mock"（預設）回傳假摘要；"live" 呼叫 Claude API */
  mode?: string;
  apiKey?: string;
  model?: string;
  /** 可注入用於測試 */
  client?: Pick<Anthropic, "messages">;
};

const DEFAULT_MODEL = "claude-opus-4-8";

/**
 * 將字幕 + 影片資訊生成繁體中文摘要（一次產出長短兩版）。
 * 依 mode 決定走 mock 或真實 Claude API。
 */
export async function summarize(
  metadata: VideoMetadata,
  segments: TranscriptSegment[],
  options: SummarizeOptions = {},
): Promise<Summary> {
  const mode = options.mode ?? process.env.SUMMARIZE_MODE ?? "mock";
  if (mode !== "live") {
    return mockSummary(metadata, segments);
  }
  return liveSummary(metadata, segments, options);
}

/** 從字幕均勻取樣 n 個片段，作為假摘要的重點來源 */
function sampleSegments(segments: TranscriptSegment[], n: number): TranscriptSegment[] {
  if (segments.length <= n) return segments;
  const step = segments.length / n;
  const picked: TranscriptSegment[] = [];
  for (let i = 0; i < n; i++) {
    picked.push(segments[Math.floor(i * step)]);
  }
  return picked;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

/** 開發期假摘要：以字幕片段組出可預期的重點，方便先把 UI/流程跑通 */
export function mockSummary(
  metadata: VideoMetadata,
  segments: TranscriptSegment[],
): Summary {
  const toBullets = (count: number): Bullet[] =>
    sampleSegments(segments, count).map((seg) => ({
      point: `（範例摘要）約 ${formatTimestamp(seg.start)} 處提到：${truncate(seg.text, 40)}`,
      timestamp: seg.start,
    }));

  return {
    videoId: metadata.videoId,
    metadata,
    short: toBullets(3),
    long: toBullets(6),
  };
}

const BULLET_ITEMS_SCHEMA = {
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
} as const;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    short: BULLET_ITEMS_SCHEMA,
    long: BULLET_ITEMS_SCHEMA,
  },
  required: ["short", "long"],
  additionalProperties: false,
} as const;

function buildTranscriptText(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[${Math.floor(s.start)}s] ${s.text}`)
    .join("\n");
}

/** 真實摘要：呼叫 Claude，要求輸出繁體中文 JSON（長短兩版 + 時間戳秒數） */
async function liveSummary(
  metadata: VideoMetadata,
  segments: TranscriptSegment[],
  options: SummarizeOptions,
): Promise<Summary> {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !options.client) {
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, "尚未設定 ANTHROPIC_API_KEY");
  }
  const model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const client = options.client ?? new Anthropic({ apiKey });

  const system =
    "你是專業的影片重點摘要助手。根據提供的逐字稿，產出條列式重點。" +
    "一律使用繁體中文。每個重點附上最相關的時間戳（以秒為單位的整數，取自逐字稿的 [Ns] 標記）。" +
    "short 為精簡版（3–5 點），long 為詳盡版（6–10 點）。" +
    "重點需具體、能獨立閱讀，避免空泛。";

  const userContent =
    `影片標題：${metadata.title}\n頻道：${metadata.channel}\n\n逐字稿：\n` +
    buildTranscriptText(segments);

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 16000,
      system,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [{ role: "user", content: userContent }],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, `摘要生成失敗：${msg}`);
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, "摘要回應格式異常");
  }

  let parsed: { short: Bullet[]; long: Bullet[] };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new AppError(ErrorCodes.SUMMARIZE_FAILED, "摘要回應無法解析");
  }

  return {
    videoId: metadata.videoId,
    metadata,
    short: parsed.short ?? [],
    long: parsed.long ?? [],
  };
}

import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
  YoutubeTranscriptVideoUnavailableError,
} from "youtube-transcript";
import { AppError, ErrorCodes } from "./errors";
import type { TranscriptSegment } from "./types";

type RawSegment = { text: string; offset: number };

export type TranscriptOptions = {
  supadataKey?: string;
  fetchFn?: typeof fetch;
};

// 連續字幕片段的時間間隔中位數門檻：字幕節奏通常 1–6 秒，
// 毫秒會落在 1000+。大於此值即判定為毫秒，需除以 1000 轉成秒。
const MS_GAP_THRESHOLD = 50;

const SUPADATA_ENDPOINT = "https://api.supadata.ai/v1/youtube/transcript";

/**
 * 正規化字幕片段的時間單位為「秒」。
 *
 * youtube-transcript 對 srv3 格式回傳毫秒、classic 格式回傳秒（不一致），
 * 且無法從回傳值直接得知是哪種。以連續片段間隔的中位數判斷單位。
 */
export function normalizeSegments(raw: RawSegment[]): TranscriptSegment[] {
  const segments = raw
    .filter((r) => r.text && r.text.trim().length > 0)
    .map((r) => ({ text: r.text.trim(), start: r.offset }));

  if (segments.length < 2) return segments;

  const gaps: number[] = [];
  for (let i = 1; i < segments.length; i++) {
    gaps.push(segments[i].start - segments[i - 1].start);
  }
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];

  if (median > MS_GAP_THRESHOLD) {
    return segments.map((s) => ({ ...s, start: s.start / 1000 }));
  }
  return segments;
}

type SupadataChunk = { text?: string; offset?: number };

/**
 * 透過 Supadata 取得字幕（雲端可用，且無字幕影片會自動轉寫）。
 * offset 為毫秒，統一轉成秒。
 */
export async function fetchViaSupadata(
  videoId: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<TranscriptSegment[]> {
  const url = `${SUPADATA_ENDPOINT}?videoId=${encodeURIComponent(videoId)}`;

  let res: Response;
  try {
    res = await fetchFn(url, { headers: { "x-api-key": apiKey } });
  } catch {
    throw new AppError(ErrorCodes.TRANSCRIPT_FETCH_FAILED, "無法連線字幕服務");
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new AppError(ErrorCodes.NO_TRANSCRIPT, "此影片沒有可用字幕，無法摘要");
    }
    throw new AppError(
      ErrorCodes.TRANSCRIPT_FETCH_FAILED,
      `字幕服務回應失敗（${res.status}）`,
    );
  }

  const data = (await res.json()) as { content?: SupadataChunk[] };
  const content = Array.isArray(data.content) ? data.content : [];
  const segments: TranscriptSegment[] = content
    .filter((c) => c.text && c.text.trim().length > 0)
    .map((c) => ({ text: c.text!.trim(), start: (c.offset ?? 0) / 1000 }));

  if (segments.length === 0) {
    throw new AppError(ErrorCodes.NO_TRANSCRIPT, "此影片沒有可用字幕，無法摘要");
  }
  return segments;
}

/** 透過 youtube-transcript 套件取得字幕（本機可用，雲端 IP 常被 YouTube 封鎖） */
async function fetchViaYoutubeTranscript(videoId: string): Promise<TranscriptSegment[]> {
  let raw: RawSegment[];
  try {
    raw = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    if (
      err instanceof YoutubeTranscriptDisabledError ||
      err instanceof YoutubeTranscriptNotAvailableError ||
      err instanceof YoutubeTranscriptNotAvailableLanguageError
    ) {
      throw new AppError(ErrorCodes.NO_TRANSCRIPT, "此影片沒有可用字幕，無法摘要");
    }
    if (err instanceof YoutubeTranscriptVideoUnavailableError) {
      throw new AppError(ErrorCodes.VIDEO_UNAVAILABLE, "找不到這部影片，或影片不公開");
    }
    throw new AppError(ErrorCodes.TRANSCRIPT_FETCH_FAILED, "抓取字幕時發生錯誤，請稍後再試");
  }

  const segments = normalizeSegments(raw);
  if (segments.length === 0) {
    throw new AppError(ErrorCodes.NO_TRANSCRIPT, "此影片沒有可用字幕，無法摘要");
  }
  return segments;
}

/**
 * 抓取指定影片的字幕。
 * 有設定 SUPADATA_API_KEY 時優先用 Supadata（雲端可靠 + 無字幕備援）；
 * 若 Supadata 遇到非「無字幕」的錯誤，回退到 youtube-transcript（本機可用）。
 */
export async function fetchTranscript(
  videoId: string,
  options: TranscriptOptions = {},
): Promise<TranscriptSegment[]> {
  const supadataKey = options.supadataKey ?? process.env.SUPADATA_API_KEY;

  if (supadataKey) {
    try {
      return await fetchViaSupadata(videoId, supadataKey, options.fetchFn);
    } catch (err) {
      // 影片確定無字幕就直接回報；其他錯誤才回退
      if (
        err instanceof AppError &&
        (err.code === ErrorCodes.NO_TRANSCRIPT ||
          err.code === ErrorCodes.VIDEO_UNAVAILABLE)
      ) {
        throw err;
      }
    }
  }

  return fetchViaYoutubeTranscript(videoId);
}

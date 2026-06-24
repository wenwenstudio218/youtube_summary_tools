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

// 連續字幕片段的時間間隔中位數門檻：字幕節奏通常 1–6 秒，
// 毫秒會落在 1000+。大於此值即判定為毫秒，需除以 1000 轉成秒。
const MS_GAP_THRESHOLD = 50;

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

/**
 * 抓取指定影片的字幕並正規化時間單位。
 * 無字幕或抓取失敗時拋出帶錯誤碼的 AppError。
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[]> {
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

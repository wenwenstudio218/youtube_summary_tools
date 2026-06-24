import { NextResponse } from "next/server";
import { extractVideoId, fetchMetadata } from "@/lib/youtube";
import { fetchTranscript } from "@/lib/transcript";
import { summarize } from "@/lib/summarize";
import { AppError, ErrorCodes } from "@/lib/errors";
import { toErrorResponse } from "@/lib/apiError";

/** 摘要可能呼叫 Claude，需較長執行時間 */
export const maxDuration = 60;

/** POST /api/summarize  body: { url } — 抓字幕並生成長短兩版摘要 */
export async function POST(request: Request) {
  try {
    let body: { url?: unknown };
    try {
      body = await request.json();
    } catch {
      throw new AppError(ErrorCodes.INVALID_URL, "請求格式錯誤");
    }

    const url = typeof body.url === "string" ? body.url : "";
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new AppError(ErrorCodes.INVALID_URL, "請輸入有效的 YouTube 影片網址");
    }

    const [metadata, segments] = await Promise.all([
      fetchMetadata(videoId),
      fetchTranscript(videoId),
    ]);

    const summary = await summarize(metadata, segments);
    return NextResponse.json(summary);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

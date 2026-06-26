import { NextResponse } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { fetchTranscript } from "@/lib/transcript";
import { ask } from "@/lib/ask";
import { AppError, ErrorCodes } from "@/lib/errors";
import { toErrorResponse } from "@/lib/apiError";
import type { AskHistoryItem } from "@/lib/types";

/** 回答可能呼叫 Claude，需較長執行時間 */
export const maxDuration = 60;

function parseHistory(value: unknown): AskHistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (h): h is AskHistoryItem =>
        h &&
        typeof h.text === "string" &&
        (h.role === "user" || h.role === "assistant"),
    )
    .map((h) => ({ role: h.role, text: h.text }));
}

/** POST /api/ask  body: { url, question, history } */
export async function POST(request: Request) {
  try {
    let body: { url?: unknown; question?: unknown; history?: unknown };
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

    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      throw new AppError(ErrorCodes.INVALID_URL, "請輸入問題");
    }

    const history = parseHistory(body.history);

    const segments = await fetchTranscript(videoId);
    const result = await ask(segments, question, history);
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

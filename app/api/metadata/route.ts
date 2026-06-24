import { NextResponse } from "next/server";
import { extractVideoId, fetchMetadata } from "@/lib/youtube";
import { AppError, ErrorCodes } from "@/lib/errors";
import { toErrorResponse } from "@/lib/apiError";

/** GET /api/metadata?url=... — 取得影片標題、頻道、縮圖 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url).searchParams.get("url") ?? "";
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new AppError(ErrorCodes.INVALID_URL, "請輸入有效的 YouTube 影片網址");
    }
    const metadata = await fetchMetadata(videoId);
    return NextResponse.json(metadata);
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

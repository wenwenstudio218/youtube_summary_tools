import { AppError, ErrorCodes } from "./errors";
import type { VideoMetadata } from "./types";

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * 從多種 YouTube 網址格式或裸 ID 解析出 11 碼 video ID。
 * 支援：watch?v=、youtu.be/、/shorts/、/embed/、/v/、/live/、youtube-nocookie。
 * 解析不出來回傳 null。
 */
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (ID_RE.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return ID_RE.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && ID_RE.test(v)) return v;

    const m = url.pathname.match(/\/(?:shorts|embed|v|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }

  return null;
}

type OEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

/**
 * 透過 YouTube oEmbed 取得影片標題、頻道、縮圖（免金鑰、免額度）。
 * fetchFn 可注入以利測試。
 */
export async function fetchMetadata(
  videoId: string,
  fetchFn: typeof fetch = fetch,
): Promise<VideoMetadata> {
  const oembedUrl =
    `https://www.youtube.com/oembed?url=` +
    encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`) +
    `&format=json`;

  let res: Response;
  try {
    res = await fetchFn(oembedUrl);
  } catch {
    throw new AppError(ErrorCodes.METADATA_FAILED, "無法連線取得影片資訊");
  }

  if (res.status === 404 || res.status === 401) {
    throw new AppError(ErrorCodes.VIDEO_UNAVAILABLE, "找不到這部影片，或影片不公開");
  }
  if (!res.ok) {
    throw new AppError(ErrorCodes.METADATA_FAILED, `取得影片資訊失敗（${res.status}）`);
  }

  const data = (await res.json()) as OEmbedResponse;
  return {
    videoId,
    title: data.title ?? "（無標題）",
    channel: data.author_name ?? "（未知頻道）",
    thumbnail: data.thumbnail_url ?? "",
  };
}

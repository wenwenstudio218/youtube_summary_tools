import { AppError, ErrorCodes } from "./errors";
import { parseIsoDuration } from "./duration";
import type { SearchFilters, SearchResult, VideoCard } from "./types";

export type SearchOptions = {
  /** "mock" 回傳假卡片；"live" 呼叫 YouTube API。預設依是否有金鑰判斷 */
  mode?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
};

const SEARCH_ENDPOINT = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_ENDPOINT = "https://www.googleapis.com/youtube/v3/videos";
const PAGE_SIZE = 12;

const UPLOADED_WINDOW_MS: Record<string, number> = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};

/** 依篩選條件組裝 search.list 的查詢參數（不含 key） */
export function buildSearchListParams(
  query: string,
  filters: SearchFilters,
  pageToken: string | undefined,
  now: number = Date.now(),
): URLSearchParams {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(PAGE_SIZE),
    q: query,
    order: filters.order,
  });
  if (filters.length !== "any") {
    params.set("videoDuration", filters.length);
  }
  if (filters.uploaded !== "any") {
    const window = UPLOADED_WINDOW_MS[filters.uploaded];
    params.set("publishedAfter", new Date(now - window).toISOString());
  }
  if (pageToken) {
    params.set("pageToken", pageToken);
  }
  return params;
}

/** 搜尋影片並補上時長，回傳卡片清單與下一頁 token */
export async function searchVideos(
  query: string,
  filters: SearchFilters,
  pageToken: string | undefined,
  options: SearchOptions = {},
): Promise<SearchResult> {
  const apiKey = options.apiKey ?? process.env.YOUTUBE_API_KEY;
  const mode = options.mode ?? (apiKey ? "live" : "mock");
  if (mode !== "live") {
    return mockSearch(query, pageToken);
  }
  if (!apiKey) {
    throw new AppError(ErrorCodes.SEARCH_FAILED, "尚未設定 YOUTUBE_API_KEY");
  }
  return liveSearch(query, filters, pageToken, apiKey, options.fetchFn ?? fetch);
}

/** 開發/測試用假搜尋：產生可預期的卡片，第一頁附假 nextPageToken */
export function mockSearch(query: string, pageToken: string | undefined): SearchResult {
  const items: VideoCard[] = Array.from({ length: PAGE_SIZE }, (_, i) => {
    const n = (pageToken === "page2" ? PAGE_SIZE : 0) + i + 1;
    return {
      videoId: `mockid${n.toString().padStart(2, "0")}`,
      title: `（範例結果）「${query}」相關影片 #${n}`,
      channel: `範例頻道 ${((n - 1) % 4) + 1}`,
      thumbnail: "",
      duration: 90 * n,
    };
  });
  return {
    items,
    nextPageToken: pageToken ? undefined : "page2",
  };
}

type SearchListItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
};

async function liveSearch(
  query: string,
  filters: SearchFilters,
  pageToken: string | undefined,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<SearchResult> {
  const params = buildSearchListParams(query, filters, pageToken);
  params.set("key", apiKey);

  const searchRes = await fetchOrThrow(fetchFn, `${SEARCH_ENDPOINT}?${params}`);
  const searchData = (await searchRes.json()) as {
    items?: SearchListItem[];
    nextPageToken?: string;
  };

  const rows = (searchData.items ?? []).filter((it) => it.id?.videoId);
  const ids = rows.map((it) => it.id!.videoId!);
  const durations = ids.length
    ? await fetchDurations(ids, apiKey, fetchFn)
    : new Map<string, number>();

  const items: VideoCard[] = rows.map((it) => {
    const videoId = it.id!.videoId!;
    const sn = it.snippet ?? {};
    return {
      videoId,
      title: sn.title ?? "（無標題）",
      channel: sn.channelTitle ?? "（未知頻道）",
      thumbnail: sn.thumbnails?.medium?.url ?? sn.thumbnails?.default?.url ?? "",
      duration: durations.get(videoId) ?? 0,
    };
  });

  return { items, nextPageToken: searchData.nextPageToken };
}

async function fetchDurations(
  ids: string[],
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<Map<string, number>> {
  const params = new URLSearchParams({
    part: "contentDetails",
    id: ids.join(","),
    key: apiKey,
  });
  const res = await fetchOrThrow(fetchFn, `${VIDEOS_ENDPOINT}?${params}`);
  const data = (await res.json()) as {
    items?: { id?: string; contentDetails?: { duration?: string } }[];
  };
  const map = new Map<string, number>();
  for (const item of data.items ?? []) {
    if (item.id) {
      map.set(item.id, parseIsoDuration(item.contentDetails?.duration ?? ""));
    }
  }
  return map;
}

/** 呼叫 YouTube API，將配額/錯誤轉成 AppError */
async function fetchOrThrow(fetchFn: typeof fetch, url: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetchFn(url);
  } catch {
    throw new AppError(ErrorCodes.SEARCH_FAILED, "無法連線 YouTube 搜尋服務");
  }
  if (res.ok) return res;

  if (res.status === 403) {
    const body = await res.text();
    if (body.includes("quotaExceeded")) {
      throw new AppError(ErrorCodes.QUOTA_EXCEEDED, "今日搜尋額度已用完，請明天再試");
    }
  }
  throw new AppError(ErrorCodes.SEARCH_FAILED, `搜尋失敗（${res.status}）`);
}

"use client";

import { useState } from "react";
import { VideoCard } from "./VideoCard";
import type {
  ApiErrorBody,
  SearchFilters,
  SearchResult,
  VideoCard as VideoCardType,
} from "@/lib/types";

type Props = {
  onSummarize: (videoId: string) => void;
};

const DEFAULT_FILTERS: SearchFilters = {
  order: "relevance",
  uploaded: "any",
  length: "any",
};

const ORDER_OPTIONS: { value: SearchFilters["order"]; label: string }[] = [
  { value: "relevance", label: "相關度" },
  { value: "date", label: "上傳日期" },
  { value: "viewCount", label: "觀看次數" },
  { value: "rating", label: "評分" },
];
const UPLOADED_OPTIONS: { value: SearchFilters["uploaded"]; label: string }[] = [
  { value: "any", label: "不限時間" },
  { value: "today", label: "今天" },
  { value: "week", label: "本週" },
  { value: "month", label: "本月" },
  { value: "year", label: "今年" },
];
const LENGTH_OPTIONS: { value: SearchFilters["length"]; label: string }[] = [
  { value: "any", label: "不限長度" },
  { value: "short", label: "短片（<4 分）" },
  { value: "medium", label: "中片（4–20 分）" },
  { value: "long", label: "長片（>20 分）" },
];

const selectClass =
  "cursor-pointer rounded-lg border border-hairline bg-surface px-3 py-2 font-data text-xs text-ink focus:border-pine focus:outline-none";

/** 搜尋模式：關鍵字 + 篩選 + 結果網格 + 載入更多 */
export function SearchPanel({ onSummarize }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<VideoCardType[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  function buildUrl(pageToken?: string): string {
    const sp = new URLSearchParams({
      q: query,
      order: filters.order,
      uploaded: filters.uploaded,
      length: filters.length,
    });
    if (pageToken) sp.set("pageToken", pageToken);
    return `/api/search?${sp}`;
  }

  async function fetchResult(pageToken?: string): Promise<SearchResult> {
    const res = await fetch(buildUrl(pageToken));
    if (!res.ok) {
      const b = (await res.json()) as ApiErrorBody;
      throw new Error(b.error?.message ?? "搜尋失敗，請稍後再試");
    }
    return (await res.json()) as SearchResult;
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await fetchResult();
      setItems(data.items);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setItems([]);
      setNextPageToken(undefined);
      setError(err instanceof Error ? err.message : "搜尋失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await fetchResult(nextPageToken);
      setItems((prev) => [...prev, ...data.items]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入更多失敗");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <form onSubmit={handleSearch} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="search-q" className="sr-only">
            搜尋關鍵字
          </label>
          <input
            id="search-q"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋 YouTube 影片…"
            className="flex-1 rounded-xl border border-hairline bg-surface px-4 py-3 font-data text-sm text-ink placeholder:text-muted/70 focus:border-pine focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="cursor-pointer rounded-xl bg-pine px-6 py-3 font-display text-sm font-medium text-paper transition-colors duration-200 hover:bg-pine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loading ? "搜尋中…" : "搜尋"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            aria-label="排序方式"
            value={filters.order}
            onChange={(e) =>
              setFilters((f) => ({ ...f, order: e.target.value as SearchFilters["order"] }))
            }
            className={selectClass}
          >
            {ORDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            aria-label="上傳時間"
            value={filters.uploaded}
            onChange={(e) =>
              setFilters((f) => ({ ...f, uploaded: e.target.value as SearchFilters["uploaded"] }))
            }
            className={selectClass}
          >
            {UPLOADED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            aria-label="影片長度"
            value={filters.length}
            onChange={(e) =>
              setFilters((f) => ({ ...f, length: e.target.value as SearchFilters["length"] }))
            }
            className={selectClass}
          >
            {LENGTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-seek/30 bg-seek/5 px-4 py-3 text-center font-data text-sm text-seek"
        >
          {error}
        </p>
      )}

      {searched && !loading && !error && items.length === 0 && (
        <p className="mt-8 text-center font-reading text-muted">找不到相關影片，換個關鍵字試試。</p>
      )}

      {items.length > 0 && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((card) => (
              <VideoCard key={card.videoId} card={card} onSummarize={onSummarize} />
            ))}
          </div>
          {nextPageToken && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="cursor-pointer rounded-lg border border-hairline px-5 py-2.5 font-display text-sm text-ink transition-colors duration-200 hover:border-pine hover:text-pine disabled:opacity-45"
              >
                {loadingMore ? "載入中…" : "載入更多"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

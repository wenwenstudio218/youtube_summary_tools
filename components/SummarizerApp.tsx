"use client";

import { useRef, useState } from "react";
import { VideoPlayer, type VideoPlayerHandle } from "./VideoPlayer";
import { SummaryPanel } from "./SummaryPanel";
import { QAPanel } from "./QAPanel";
import { SearchPanel } from "./SearchPanel";
import { ModeToggle, type Mode } from "./ModeToggle";
import type { ApiErrorBody, Summary } from "@/lib/types";

export function SummarizerApp() {
  const [mode, setMode] = useState<Mode>("search");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const playerRef = useRef<VideoPlayerHandle>(null);

  /** 共用的摘要流程：網址送出與卡片「立即摘要」都走這裡 */
  async function summarizeVideo(videoUrl: string) {
    if (!videoUrl.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorBody;
        throw new Error(body.error?.message ?? "整理失敗，請稍後再試");
      }
      setSummary((await res.json()) as Summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "整理失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setSummary(null);
    setError(null);
  }

  // ── 摘要視圖 ──────────────────────────────
  if (summary) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
        <button
          type="button"
          onClick={handleBack}
          className="mb-6 cursor-pointer font-data text-xs text-muted transition-colors duration-200 hover:text-pine"
        >
          ← 返回
        </button>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <VideoPlayer ref={playerRef} videoId={summary.videoId} />
            <h2 className="mt-4 font-display text-lg font-semibold leading-snug text-ink">
              {summary.metadata.title}
            </h2>
            <p className="mt-1 font-data text-xs text-muted">{summary.metadata.channel}</p>
          </div>

          <div>
            <SummaryPanel summary={summary} onSeek={(s) => playerRef.current?.seekTo(s)} />
            <QAPanel
              key={summary.videoId}
              url={`https://www.youtube.com/watch?v=${summary.videoId}`}
              onSeek={(s) => playerRef.current?.seekTo(s)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── 載入中（摘要產生中）────────────────────
  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-5 py-24">
        <p className="font-data text-sm text-muted">整理摘要中…</p>
      </div>
    );
  }

  // ── 輸入視圖（搜尋 / 貼網址）──────────────────
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      <header className="mb-8 text-center sm:mb-10">
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          把影片，讀成筆記
        </h1>
        <p className="mt-4 font-reading text-lg text-muted">
          搜尋或貼上 YouTube 網址，整理成可隨時跳轉的摘要
        </p>
        <div className="mt-6 flex justify-center">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mx-auto mb-6 max-w-2xl rounded-lg border border-seek/30 bg-seek/5 px-4 py-3 text-center font-data text-sm text-seek"
        >
          {error}
        </p>
      )}

      {mode === "search" ? (
        <SearchPanel
          onSummarize={(videoId) =>
            summarizeVideo(`https://www.youtube.com/watch?v=${videoId}`)
          }
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            summarizeVideo(url);
          }}
          className="mx-auto flex max-w-2xl flex-col gap-2.5 sm:flex-row"
        >
          <label htmlFor="yt-url" className="sr-only">
            YouTube 影片網址
          </label>
          <input
            id="yt-url"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="貼上 YouTube 影片網址…"
            className="flex-1 rounded-xl border border-hairline bg-surface px-4 py-3 font-data text-sm text-ink placeholder:text-muted/70 focus:border-pine focus:outline-none"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="cursor-pointer rounded-xl bg-pine px-6 py-3 font-display text-sm font-medium text-oncolor transition-colors duration-200 hover:bg-pine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:cursor-not-allowed disabled:opacity-45"
          >
            整理摘要
          </button>
        </form>
      )}
    </div>
  );
}

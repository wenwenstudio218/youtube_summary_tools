"use client";

import { useRef, useState } from "react";
import { VideoPlayer, type VideoPlayerHandle } from "./VideoPlayer";
import { SummaryPanel } from "./SummaryPanel";
import { QAPanel } from "./QAPanel";
import type { ApiErrorBody, Summary } from "@/lib/types";

export function SummarizerApp() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const playerRef = useRef<VideoPlayerHandle>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorBody;
        throw new Error(body.error?.message ?? "整理失敗，請稍後再試");
      }
      const data = (await res.json()) as Summary;
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err instanceof Error ? err.message : "整理失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-12">
      {!summary && (
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            把影片，讀成筆記。
          </h1>
          <p className="mt-4 font-reading text-lg text-muted">
            貼上 YouTube 網址，自動整理成可隨時跳轉的重點。
          </p>
        </header>
      )}

      <form
        onSubmit={handleSubmit}
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
          disabled={loading || !url.trim()}
          className="cursor-pointer rounded-xl bg-pine px-6 py-3 font-display text-sm font-medium text-paper transition-colors duration-200 hover:bg-pine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? "整理中…" : "整理重點"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-2xl rounded-lg border border-seek/30 bg-seek/5 px-4 py-3 text-center font-data text-sm text-seek"
        >
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          <div className="lg:sticky lg:top-8 lg:self-start">
            <VideoPlayer ref={playerRef} videoId={summary.videoId} />
            <h2 className="mt-4 font-display text-lg font-semibold leading-snug text-ink">
              {summary.metadata.title}
            </h2>
            <p className="mt-1 font-data text-xs text-muted">
              {summary.metadata.channel}
            </p>
          </div>

          <div>
            <SummaryPanel
              summary={summary}
              onSeek={(s) => playerRef.current?.seekTo(s)}
            />
            <QAPanel
              key={summary.videoId}
              url={`https://www.youtube.com/watch?v=${summary.videoId}`}
              onSeek={(s) => playerRef.current?.seekTo(s)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

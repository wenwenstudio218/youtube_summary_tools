import { SummarizerApp } from "@/components/SummarizerApp";

export default function Home() {
  return (
    <>
      <header className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-5 py-4">
          <span
            className="inline-block h-4 w-1.5 rounded-full bg-seek"
            aria-hidden
          />
          <span className="font-display text-sm font-semibold tracking-tight text-ink">
            YT 內容整理
          </span>
        </div>
      </header>

      <main className="flex-1">
        <SummarizerApp />
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto w-full max-w-6xl px-5 py-5 font-data text-xs text-muted">
          貼上網址 · 抓字幕 · 整理重點
        </div>
      </footer>
    </>
  );
}

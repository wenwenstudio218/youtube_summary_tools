import { SummarizerApp } from "@/components/SummarizerApp";

export default function Home() {
  return (
    <>
      <header className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-5 py-4">
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            role="img"
            aria-label="YouTube"
            className="shrink-0"
          >
            <path
              fill="#FF0000"
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
            />
            <path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span className="font-display text-sm font-semibold tracking-tight text-ink">
            Youtube影片 摘要整理工具
          </span>
        </div>
      </header>

      <main className="flex-1">
        <SummarizerApp />
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto w-full max-w-6xl px-5 py-5 font-data text-xs text-muted">
          AI 影片摘要 · 時間戳一鍵跳轉 · 影片內容問答 · 匯出 Markdown／Word／PDF
        </div>
      </footer>
    </>
  );
}

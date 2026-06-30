"use client";

import { useState } from "react";
import { formatTimestamp } from "@/lib/time";
import type { ApiErrorBody, AskResult, Citation } from "@/lib/types";

type QAMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; citations: Citation[] };

type Props = {
  url: string;
  onSeek: (seconds: number) => void;
};

function TimestampChip({
  citation,
  onSeek,
}: {
  citation: Citation;
  onSeek: (s: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSeek(citation.timestamp)}
      title={citation.point}
      className="cursor-pointer rounded-md border border-hairline px-2 py-0.5 font-data text-xs text-muted transition-colors duration-200 hover:border-seek hover:text-seek focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-seek"
    >
      {formatTimestamp(citation.timestamp)}
    </button>
  );
}

/** 摘要下方的 Q&A 對話區：多輪提問、回答附可跳轉時間戳 */
export function QAPanel({ url, onSeek }: Props) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, question, history }),
      });
      if (!res.ok) {
        const b = (await res.json()) as ApiErrorBody;
        throw new Error(b.error?.message ?? "回答失敗，請稍後再試");
      }
      const data = (await res.json()) as AskResult;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, citations: data.citations ?? [] },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "回答失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="影片問答"
      className="mt-10 border-t border-hairline pt-8"
    >
      <h3 className="font-display text-sm font-semibold tracking-tight text-ink">
        問這部影片
      </h3>

      <div className="mt-5 space-y-5">
        {messages.length === 0 && !loading && (
          <p className="font-reading text-[0.95rem] italic text-muted">
            針對影片內容提問，例如「主要在講什麼？」「有提到 X 嗎？」
          </p>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <p
              key={i}
              className="font-data text-sm text-pine"
            >
              <span className="text-muted">你：</span>
              {m.text}
            </p>
          ) : (
            <div key={i}>
              <p className="whitespace-pre-wrap font-reading text-[1.02rem] leading-relaxed text-ink">
                {m.text}
              </p>
              {m.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.citations.map((c, ci) => (
                    <TimestampChip key={ci} citation={c} onSeek={onSeek} />
                  ))}
                </div>
              )}
            </div>
          ),
        )}

        {loading && (
          <p className="font-data text-sm text-muted">思考中…</p>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-seek/30 bg-seek/5 px-3 py-2 font-data text-sm text-seek"
          >
            {error}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
        <label htmlFor="qa-input" className="sr-only">
          輸入問題
        </label>
        <input
          id="qa-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="輸入問題…"
          className="flex-1 rounded-lg border border-hairline bg-surface px-3.5 py-2.5 font-data text-sm text-ink placeholder:text-muted/70 focus:border-pine focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="cursor-pointer rounded-lg bg-pine px-5 py-2.5 font-display text-sm font-medium text-oncolor transition-colors duration-200 hover:bg-pine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine disabled:cursor-not-allowed disabled:opacity-45"
        >
          送出
        </button>
      </form>
    </section>
  );
}

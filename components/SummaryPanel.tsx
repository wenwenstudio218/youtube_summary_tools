"use client";

import { useState } from "react";
import { BulletItem } from "./BulletItem";
import { ExportBar } from "./ExportBar";
import type { Summary, SummaryLength } from "@/lib/types";

type Props = {
  summary: Summary;
  onSeek: (seconds: number) => void;
};

const OPTIONS: { value: SummaryLength; label: string }[] = [
  { value: "short", label: "短摘要" },
  { value: "long", label: "長摘要" },
];

/** 右欄摘要面板：長/短切換、操作列、時間軸重點清單 */
export function SummaryPanel({ summary, onSeek }: Props) {
  const [length, setLength] = useState<SummaryLength>("short");
  const [activeTs, setActiveTs] = useState<number | null>(null);

  const bullets = summary[length];

  function handleSeek(seconds: number) {
    setActiveTs(seconds);
    onSeek(seconds);
  }

  return (
    <section aria-label="摘要">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="摘要長度"
          className="inline-flex rounded-lg border border-hairline bg-surface p-0.5"
        >
          {OPTIONS.map((opt) => {
            const selected = length === opt.value;
            return (
              <button
                key={opt.value}
                role="tab"
                aria-selected={selected}
                type="button"
                onClick={() => setLength(opt.value)}
                className={`cursor-pointer rounded-md px-3.5 py-1.5 font-display text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine ${
                  selected
                    ? "bg-pine text-oncolor"
                    : "text-muted hover:text-ink"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <ExportBar summary={summary} length={length} />
      </div>

      <ol key={length} className="group/list">
        {bullets.map((bullet, i) => (
          <BulletItem
            key={`${length}-${i}`}
            bullet={bullet}
            index={i}
            active={activeTs === bullet.timestamp}
            onSeek={handleSeek}
          />
        ))}
      </ol>
    </section>
  );
}

"use client";

export type Mode = "search" | "url";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "search", label: "🔍 搜尋" },
  { value: "url", label: "🔗 貼網址" },
];

/** 搜尋 / 貼網址 雙模式切換 */
export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="輸入模式"
      className="inline-flex rounded-xl border border-hairline bg-surface p-0.5"
    >
      {OPTIONS.map((opt) => {
        const selected = mode === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={selected}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`cursor-pointer rounded-lg px-4 py-2 font-display text-sm transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine ${
              selected ? "bg-pine text-oncolor" : "text-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

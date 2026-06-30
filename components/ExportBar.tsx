"use client";

import { useEffect, useRef, useState } from "react";
import { summaryToMarkdown } from "@/lib/markdown";
import { summaryToHtml } from "@/lib/exports";
import type { Summary, SummaryLength } from "@/lib/types";

type Props = {
  summary: Summary;
  length: SummaryLength;
};

function slugify(title: string): string {
  return title.trim().replace(/[\\/:*?"<>|]+/g, "").slice(0, 60) || "summary";
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 摘要操作列：複製到剪貼簿 + 匯出下拉（Markdown / Word / PDF） */
export function ExportBar({ summary, length }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summaryToMarkdown(summary, length));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const base = slugify(summary.metadata.title);

  function exportMarkdown() {
    downloadBlob(summaryToMarkdown(summary, length), "text/markdown", `${base}.md`);
  }

  function exportWord() {
    downloadBlob(summaryToHtml(summary, length), "application/msword", `${base}.doc`);
  }

  function exportPdf() {
    const html = summaryToHtml(summary, length);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    // 等內容與字型載入後再開列印對話框（使用者可選「儲存為 PDF」）
    setTimeout(() => w.print(), 300);
  }

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  const btn =
    "cursor-pointer rounded-lg border border-hairline px-3 py-1.5 font-data text-xs text-ink transition-colors duration-200 hover:border-pine hover:text-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";

  const item =
    "block w-full cursor-pointer px-3 py-2 text-left font-data text-xs text-ink transition-colors duration-200 hover:bg-pine hover:text-oncolor";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleCopy} className={btn}>
        {copied ? "已複製" : "複製"}
      </button>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={btn}
        >
          匯出 ▾
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-hairline bg-surface shadow-lg"
          >
            <button role="menuitem" type="button" className={item} onClick={() => run(exportMarkdown)}>
              Markdown (.md)
            </button>
            <button role="menuitem" type="button" className={item} onClick={() => run(exportWord)}>
              Word (.doc)
            </button>
            <button role="menuitem" type="button" className={item} onClick={() => run(exportPdf)}>
              PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

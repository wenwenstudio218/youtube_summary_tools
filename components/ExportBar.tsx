"use client";

import { useState } from "react";
import { summaryToMarkdown } from "@/lib/markdown";
import type { Summary, SummaryLength } from "@/lib/types";

type Props = {
  summary: Summary;
  length: SummaryLength;
};

function slugify(title: string): string {
  return title.trim().replace(/[\\/:*?"<>|]+/g, "").slice(0, 60) || "summary";
}

/** 摘要操作列：複製到剪貼簿、匯出 Markdown */
export function ExportBar({ summary, length }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const md = summaryToMarkdown(summary, length);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function handleExport() {
    const md = summaryToMarkdown(summary, length);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(summary.metadata.title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const btn =
    "cursor-pointer rounded-lg border border-hairline px-3 py-1.5 font-data text-xs text-ink transition-colors duration-200 hover:border-pine hover:text-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={handleCopy} className={btn}>
        {copied ? "已複製" : "複製"}
      </button>
      <button type="button" onClick={handleExport} className={btn}>
        匯出 .md
      </button>
    </div>
  );
}

import { formatTimestamp } from "./time";
import type { Summary, SummaryLength } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 將摘要轉成完整 HTML 文件字串，供 Word(.doc) 下載與 PDF 列印共用。
 * 內嵌樣式以確保開啟時排版一致；不含可點擊時間戳網址（純閱讀）。
 */
export function summaryToHtml(summary: Summary, length: SummaryLength): string {
  const { metadata, videoId } = summary;
  const bullets = summary[length];
  const lengthLabel = length === "short" ? "短版" : "長版";
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const items = bullets
    .map(
      (b) =>
        `<li><span class="ts">[${formatTimestamp(b.timestamp)}]</span> ${escapeHtml(b.point)}</li>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<title>${escapeHtml(metadata.title)}</title>
<style>
  body { font-family: "PingFang TC", "Microsoft JhengHei", sans-serif; line-height: 1.7; color: #1a1714; max-width: 720px; margin: 32px auto; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  .meta { color: #6b6660; font-size: 13px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 24px 0 12px; }
  ul { padding-left: 0; list-style: none; }
  li { margin: 0 0 10px; }
  .ts { font-family: "Menlo", monospace; color: #1f4d46; font-weight: 600; margin-right: 6px; }
  a { color: #1f4d46; }
</style>
</head>
<body>
<h1>${escapeHtml(metadata.title)}</h1>
<p class="meta">頻道：${escapeHtml(metadata.channel)}</p>
<p class="meta">影片：<a href="${videoUrl}">${videoUrl}</a></p>
<h2>重點摘要（${lengthLabel}）</h2>
<ul>
${items}
</ul>
</body>
</html>`;
}

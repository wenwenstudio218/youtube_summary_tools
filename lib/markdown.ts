import { formatTimestamp } from "./time";
import type { Summary, SummaryLength } from "./types";

/** 將摘要（指定長/短版）轉成 Markdown 字串（純函式） */
export function summaryToMarkdown(summary: Summary, length: SummaryLength): string {
  const { metadata, videoId } = summary;
  const bullets = summary[length];
  const lengthLabel = length === "short" ? "短版" : "長版";
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const lines: string[] = [
    `# ${metadata.title}`,
    "",
    `- 頻道：${metadata.channel}`,
    `- 影片：${videoUrl}`,
    "",
    `## 重點摘要（${lengthLabel}）`,
    "",
  ];

  for (const b of bullets) {
    const ts = formatTimestamp(b.timestamp);
    lines.push(`- [${ts}] ${b.point}`);
  }

  return lines.join("\n") + "\n";
}

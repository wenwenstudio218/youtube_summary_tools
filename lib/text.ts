/** 清除常見 Markdown 標記，確保純文字呈現（摘要與 Q&A 共用） */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // 粗體 **x**
    .replace(/__(.+?)__/g, "$1") // 粗體 __x__
    .replace(/`([^`]+)`/g, "$1") // 行內程式碼 `x`
    .replace(/^#{1,6}\s+/gm, ""); // 標題 # x
}

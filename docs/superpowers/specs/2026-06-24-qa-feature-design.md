# YouTube 內容整理工具 — v1.5 Q&A 功能設計

日期：2026-06-24
狀態：設計確認中
前置：v1（摘要核心）已完成並上線 live 模式

## 1. 目標與範圍

在現有摘要頁面加入「針對影片內容提問」功能：使用者可在摘要下方以多輪對話方式提問，Claude 依影片逐字稿回答，並在回答附上可點擊跳轉的時間戳。

### 範圍

- 多輪對話（Claude 記得先前問答）
- 回答附可點擊時間戳，點擊跳轉內嵌播放器（復用 v1 機制）
- 摘要一律繁體中文；Q&A 回答同樣繁體中文
- mock / live 雙模式（與摘要一致，`SUMMARIZE_MODE` 控制）

### 非範圍

- 串流逐字顯示（先不做，之後可加）
- 跨頁/跨工作階段的對話保存（對話僅存於前端當次 state）
- 逐字稿伺服器快取（每次提問重新抓取）

## 2. 技術決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 逐字稿提供方式 | `/api/ask` 每次用 videoId 重新抓字幕 | 無狀態、serverless 友善、最簡單；代價是每次多一次免費的字幕抓取 |
| 對話模式 | 多輪，歷史存前端、每次隨請求送出 | 後端無狀態；前端掌握對話 |
| 回答結構 | 結構化輸出 `{ answer, citations:[{point,timestamp}] }` | 乾淨解析、時間戳直接復用 seek，無需解析內文標記 |
| 串流 | v1.5 不串流 | 先求簡單；非串流回應足夠 |
| 模型 | 沿用 `ANTHROPIC_MODEL`（預設 claude-haiku-4-5） | 與摘要一致 |

## 3. 架構

```
lib/
  ask.ts                    ask(segments, question, history, options)
                            → { answer, citations }（mock/live 雙模式）
app/
  api/ask/route.ts          POST { url, question, history } → { answer, citations }
components/
  QAPanel.tsx               摘要下方對話區：訊息列 + 輸入框
  (TimestampChip)           回答中的可點擊時間戳（小元件，呼叫 onSeek）
```

模組邊界：`lib/ask.ts` 不碰 DOM、不知道 HTTP；`QAPanel` 僅透過 `/api/ask` 與後端溝通，並接收父層傳入的 `onSeek` 來跳轉播放器（與 `SummaryPanel` 相同模式）。

## 4. 資料流

```
使用者輸入問題 → 前端 POST /api/ask { url, question, history }
   ↓ 後端
1. extractVideoId(url)（沿用 lib/youtube）
2. fetchTranscript(videoId)（沿用 lib/transcript）
3. ask(segments, question, history)
   · system = 逐字稿（含 [Ns] 時間標記）+ 指示（繁中、附時間戳）
   · messages = history(已往返的問答) + 新問題
   · live 模式以結構化輸出回 { answer, citations }
   ↓ 回傳 { answer, citations }
4. 前端把「問題 + 回答(含 citations)」附加到對話列
   · 點 citation 時間戳 → playerRef.seekTo()（復用 v1）
```

### 型別

```ts
type Citation = { point: string; timestamp: number }; // 與 Bullet 同形
type AskResult = { answer: string; citations: Citation[] };

// 前端對話訊息
type QAMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; citations: Citation[] };

// 送往 API 的歷史（精簡，只帶角色與文字）
type AskHistoryItem = { role: "user" | "assistant"; text: string };
```

## 5. 元件行為（QAPanel）

- 放在 `SummarizerApp` 右欄、`SummaryPanel` 下方。
- 內部 state：`messages: QAMessage[]`、`input`、`loading`、`error`。
- 送出問題：樂觀地先把使用者問題加入 `messages`，POST `/api/ask`（帶當前 history），回應後加入 assistant 訊息。
- 空狀態：顯示一句邀請（例如「針對這部影片提問…」）。
- 回答中的 citations 以 mono 時間戳 chip 呈現，點擊呼叫父層 `onSeek`。
- 切換長/短摘要不影響此區。

## 6. 錯誤處理

沿用統一格式 `{ error: { code, message } }`，HTTP 狀態對應同 v1：

| 情境 | 處理 |
|------|------|
| 網址無效 | 400 `INVALID_URL` |
| 無字幕 | 422 `NO_TRANSCRIPT` |
| 空問題 | 前端擋下，不送出 |
| Claude 失敗/逾時 | 502 `SUMMARIZE_FAILED`，前端顯示可重試 |

## 7. 測試

- `lib/ask.ts`：
  - mock 模式回傳可預期的假回答 + citations
  - live 模式以注入 client 測試 messages/history 組裝與 JSON 解析
  - 回應非 JSON 時拋出 `SUMMARIZE_FAILED`
- 既有 39 測試維持綠燈。

## 8. 後續可優化（非本次）

- 串流逐字顯示
- 逐字稿伺服器快取，避免每次提問重抓
- 提示快取（prompt caching）降低逐字稿重複輸入成本

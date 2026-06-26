# YouTube 內容整理工具 — v2 搜尋功能設計

日期：2026-06-26
狀態：設計確認中
前置：v1（摘要）、v1.5（Q&A）已完成並上線 live；YouTube Data API 金鑰已就緒

## 1. 目標與範圍

讓使用者用關鍵字搜尋 YouTube 影片，以卡片呈現結果，並可直接從卡片觸發摘要（接上既有摘要 + Q&A 流程）。

### 範圍

- 關鍵字搜尋（YouTube Data API v3）
- 篩選：排序方式、上傳時間、影片長度（**不含語言** — YouTube 過濾不準，已捨棄）
- 結果卡片：縮圖（疊時長）、標題、頻道、「✨ 立即摘要」
- 一次 12 筆 + 「載入更多」分頁
- 整合方式：同一頁雙模式切換（🔍 搜尋 / 🔗 貼網址），點「立即摘要」原地換成摘要畫面
- mock / live 雙模式（`YOUTUBE_API_KEY`）

### 非範圍

- 語言篩選、頻道/播放清單搜尋
- 搜尋結果分享網址（維持單頁狀態驅動）
- 搜尋結果快取

## 2. 技術決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 整合 | 同一頁雙模式切換 | 改動最小、體驗連貫，與現有單頁架構一致 |
| 結果筆數 | 一次 12 筆 + 載入更多（pageToken） | 省配額、體驗好 |
| 時長來源 | search.list 後再 videos.list(contentDetails) | search.list 不回時長；videos.list 每次僅 1 單位 |
| 篩選 | 排序 / 上傳時間 / 影片長度 | 使用者選定（語言剔除） |
| 模式 | mock / live（`YOUTUBE_API_KEY`） | 與摘要/Q&A 一致，無金鑰或測試時可跑 |

### 配額說明

YouTube 每日免費額度 10,000 單位。`search.list` 每次呼叫 100 單位（與回傳筆數無關），`videos.list` 每次 1 單位。因此每次「搜尋」或「載入更多」約 101 單位 → **每天約 100 次搜尋動作**（每次 12 支，等於可瀏覽約 1,200 支/天）。「立即摘要」走 oEmbed + 字幕，**不耗 YouTube 配額**。

## 3. 架構

```
lib/
  duration.ts               ISO 8601 (PT#H#M#S) → 秒（純函式）
  search.ts                 searchVideos(query, filters, pageToken?, options)
                            → { items: VideoCard[], nextPageToken? }（mock/live）
app/
  api/search/route.ts       GET ?q=&order=&uploaded=&length=&pageToken= → SearchResult
components/
  ModeToggle.tsx            🔍 搜尋 / 🔗 貼網址 切換
  SearchPanel.tsx           搜尋列 + 篩選 + 結果網格 + 載入更多
  VideoCard.tsx             單張結果卡片（縮圖+時長+標題+頻道+立即摘要）
```

模組邊界：`lib/search.ts`、`lib/duration.ts` 為純邏輯、不碰 DOM；`SearchPanel` 僅透過 `/api/search` 取資料，並透過父層回呼觸發摘要。

### SummarizerApp 重構（小幅）

把現有「送出網址 → 摘要」的邏輯抽成 `summarizeVideo(videoId | url)`，讓「網址送出」與「卡片點擊立即摘要」共用同一條路徑。新增頂層 `mode: "search" | "url"` 狀態控制顯示哪個輸入區。

## 4. 資料流

```
搜尋 → 前端 GET /api/search?q=…&order=…&uploaded=…&length=…
   ↓ 後端（lib/search.ts，live）
1. search.list（type=video, q, order, publishedAfter, videoDuration, maxResults=12, pageToken）
   → 取得 videoId + snippet(title, channel, thumbnail)
2. videos.list（part=contentDetails, id=逗號串）→ 各影片 ISO 時長
3. 合併 → VideoCard[]（duration 經 lib/duration 轉秒）
   ↓ 回 { items, nextPageToken }
4. 前端網格顯示；「載入更多」帶 nextPageToken 再撈、附加到清單
點卡片「立即摘要」→ summarizeVideo(videoId) → 切到摘要+Q&A（既有流程）
```

### 型別

```ts
type VideoCard = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: number; // 秒
};

type SearchFilters = {
  order: "relevance" | "date" | "viewCount" | "rating";
  uploaded: "any" | "today" | "week" | "month" | "year";
  length: "any" | "short" | "medium" | "long";
};

type SearchResult = {
  items: VideoCard[];
  nextPageToken?: string;
};
```

篩選對應 API：`order`→`order`；`uploaded`→`publishedAfter`(由現在時間回推)；`length`→`videoDuration`(short<4分 / medium 4–20分 / long>20分)；`any` 表示該參數不帶。

## 5. 元件行為

- **ModeToggle**：切換 `mode`。切到「貼網址」顯示現有網址輸入;切到「搜尋」顯示 SearchPanel。
- **SearchPanel**：state 為 `query`、`filters`、`items`、`nextPageToken`、`loading`、`error`。送出 → 取代清單;載入更多 → 附加。空結果顯示「找不到相關影片」。
- **VideoCard**：顯示縮圖(右下疊 `formatTimestamp(duration)`)、標題(最多兩行)、頻道、「✨ 立即摘要」按鈕 → 呼叫父層 `onSummarize(videoId)`。
- 觸發摘要後切到摘要視圖(沿用 v1/v1.5 的 VideoPlayer + SummaryPanel + QAPanel)。

## 6. 錯誤處理

沿用 `{ error: { code, message } }`：

| 情境 | 處理 |
|------|------|
| 空關鍵字 | 前端擋下 |
| 配額用罄(403 quotaExceeded) | `QUOTA_EXCEEDED` → 「今日搜尋額度已用完，請明天再試」 |
| YouTube API 其他錯誤 | `SEARCH_FAILED` → 可重試訊息 |
| 無結果 | 正常回空陣列，前端顯示空狀態 |

新增錯誤碼 `QUOTA_EXCEEDED`、`SEARCH_FAILED`（對應 HTTP 502；配額 429 亦可，統一用 502 + 明確訊息）。

## 7. 測試

- `lib/duration.ts`：`PT12M34S`、`PT1H2M3S`、`PT45S`、`PT2H` 等邊界 → 秒。
- `lib/search.ts`：
  - 篩選 → API query 參數組裝（含 `any` 不帶、`publishedAfter` 計算、`videoDuration` 對應）
  - search.list + videos.list 回應合併成 VideoCard[]（注入 fetch）
  - mock 模式回傳可預期假卡片
  - 配額錯誤 → 拋 `QUOTA_EXCEEDED`
- 既有 43 測試維持綠燈。

## 8. 後續可優化（非本次）

- 語言/頻道篩選、搜尋結果分享網址、結果快取、無限捲動

# YouTube 內容整理工具 — v1 設計文件

日期：2026-06-23
狀態：設計確認中

## 1. 目標與範圍

打造一個線上工具，貼上單一 YouTube 影片網址後，自動抓取字幕並由 Claude 生成繁體中文重點摘要，搭配時間戳與內嵌播放器，方便邊看邊對照，並可複製或匯出 Markdown。

### v1 範圍（本文件）

- 貼上單一 YouTube 網址 → 取得影片資訊 → 抓字幕 → 生成摘要
- 摘要一次生成「長版」與「短版」兩種，前端切換零延遲
- 條列式重點，每點標記時間戳
- 內嵌 YouTube 播放器；點時間戳跳轉到該秒數（signature element）
- 複製摘要到剪貼簿
- 匯出為 Markdown
- 摘要輸出語言一律繁體中文

### 非 v1 範圍（後續版本）

- YouTube 關鍵字搜尋與篩選、結果卡片（v1 搜尋先用假資料，真 API 之後再接）
- 針對影片內容的 Q&A（v1.5）
- 匯出 PDF / Word、整合 Notion 與筆記軟體
- 語音轉文字（Whisper）作為無字幕影片的備援字幕來源

## 2. 技術決策

| 項目 | 決策 | 理由 |
|------|------|------|
| 框架 | Next.js（App Router）全端 | 前後端一體、API 路由可安全隱藏金鑰、易部署 |
| 影片資訊 | YouTube oEmbed | 免金鑰、免額度，可取得標題、頻道、縮圖 |
| 字幕 | `youtube-transcript` 套件（後端） | 免費抓取內建/自動字幕；無字幕影片無法處理 |
| AI | Claude API，經 adapter 包裝 | 開發期回 mock，取得金鑰後以環境變數切換真 API |
| 摘要語言 | 一律繁體中文 | 需求確認 |
| 版面 | 左右兩欄（播放器固定在左、重點在右） | 桌機適合邊看邊讀；手機自動改為上下堆疊 |

### Claude 金鑰狀態

使用者尚未持有 Anthropic API 金鑰。開發期 `summarize.ts` 預設走 mock 模式（回傳結構化假摘要），待取得金鑰後設定環境變數即切換為真實呼叫。另需另行協助使用者申請 Anthropic API 金鑰。

## 3. 架構

```
app/
  page.tsx                  主頁面（貼網址 → 摘要）
  api/
    metadata/route.ts       GET 影片標題/縮圖/頻道（oEmbed）
    summarize/route.ts      POST 抓字幕 + 生成摘要（長短兩版）
lib/
  youtube.ts                解析 video ID、呼叫 oEmbed
  transcript.ts             抓取字幕（youtube-transcript）
  summarize.ts              Claude adapter（mock ⇄ 真 API，env 切換）
  markdown.ts               摘要物件 → Markdown 字串
components/
  UrlInput                  網址輸入框 + 摘要按鈕
  VideoPlayer               內嵌 YouTube 播放器（IFrame API，支援 seekTo）
  SummaryPanel              長/短切換 + 重點清單 + 操作列
  BulletItem                單一重點 + 時間戳（點擊跳轉）
  ExportBar                 複製、匯出 Markdown
```

### 模組邊界

每個 `lib` 檔職責單一、可獨立測試：`youtube` 不知道 Claude 存在、`summarize` 不碰 DOM、`markdown` 為純函式。前端僅透過兩個 API 路由與後端溝通。

## 4. 資料流

```
使用者貼網址 → 前端 POST /api/summarize { url }
   ↓ 後端
1. youtube.ts   解析 video ID（支援 watch?v=、youtu.be、shorts 等格式）
2. 並行抓取：
   · metadata（oEmbed：標題、頻道、縮圖）
   · transcript（youtube-transcript：[{ text, start 秒 }, ...]）
3. summarize.ts 將「逐字稿 + 時間戳」組成 prompt → Claude（或 mock）
   · 要求輸出繁體中文 JSON，一次產出長短兩版
   · 每個重點附最相關的時間戳（秒）
   ↓ 回傳
4. 前端渲染：VideoPlayer（內嵌）+ SummaryPanel（重點清單）
   · 點時間戳 → 呼叫 YouTube IFrame API 的 seekTo() 跳轉
   · 短/長切換 → 前端在已取得的兩版之間切換，不再打 API
```

### 摘要回傳資料結構

```ts
type Summary = {
  videoId: string
  metadata: { title: string; channel: string; thumbnail: string }
  short: Bullet[]
  long: Bullet[]
}
type Bullet = {
  point: string        // 繁體中文重點
  timestamp: number    // 秒
}
```

`metadata/route.ts` 提供影片資訊的獨立查詢（例如貼上網址後先即時顯示標題與縮圖，再等摘要完成）。`summarize/route.ts` 則回傳完整 `Summary`。

## 5. 錯誤處理

所有 API 路由統一回傳 `{ error: { code, message } }`。

| 情境 | 處理 |
|------|------|
| 網址格式錯誤 | 前端即時提示，不送出 |
| 影片無字幕 | 後端回 `NO_TRANSCRIPT`，前端顯示「此影片沒有可用字幕，無法摘要」 |
| 影片不存在/字幕抓取失敗 | 對應友善訊息 |
| Claude（或 mock）逾時/失敗 | 顯示重試按鈕 |

## 6. 測試

- `lib/youtube.ts`：各種網址格式解析 → 單元測試
- `lib/transcript.ts`：mock HTTP 回應，測試解析邏輯
- `lib/summarize.ts`：mock 模式直接測試 prompt 組裝與 JSON 解析
- `lib/markdown.ts`：摘要物件 → Markdown 輸出
- API 路由：happy path + 無字幕 + 錯誤網址

## 7. 設計風格

UI 細節於實作階段依專案 CLAUDE.md 規範，先讀取 ui-ux-pro-max 取得業界規範與推薦方向，再讀取 frontend-design 制定本次任務的具體設計計畫（色票、字型配對、版型、signature element），通過自我審查後才實作。版面方向已確認為「左右兩欄」。

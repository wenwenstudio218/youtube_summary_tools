# CLAUDE.md

## 語言與排版

- 一律使用**繁體中文**回覆，除非使用者指定特定語言
- 中文之間使用**全形標點符號**（。，、：；「」）
- 英文、數字與中文之間**兩側加上半形空白**（例如：Python 後端、AI/ML 技術）

## 行動協議

- 執行**重要開發行動**前，先輸出簡要計劃，等待確認後再執行
- 信心度低或有更好方案時，直接上網研究後提出，無須護主
- 可主動向使用者提問，以獲取所需資訊

## UI/UX Design Skills

本專案使用兩個互補的設計 skill，處理不同層次的設計決策。

### 1. Anthropic Frontend Design Skill
路徑：`.claude/skills/frontend-design/SKILL.md`

**何時讀取：**
- 開始設計任何新頁面或元件之前
- 重構現有 UI 之前
- 對設計方向感到不確定時

**用途：**
負責設計思維與哲學層。讀取後，針對當前任務制定設計計畫，
包含色票（4-6 個 hex）、字型配對、版型概念、以及一個
signature element。計畫確認不落入 AI 通用樣板後，才開始寫程式碼。

---

### 2. UI UX Pro Max Skill
路徑：`.claude/skills/ui-ux-pro-max/SKILL.md`

**何時讀取：**
- 需要確認 Developer Tool / AI-Native 產品的業界設計規範時
- 選擇色票、字型組合、動畫效果時
- 需要確認該避免哪些 anti-pattern 時

**用途：**
負責設計資料與最佳實踐層。本專案屬於「Developer Tool」與
「AI/Chatbot Platform」類型，讀取後查詢對應的推薦樣式、
色彩方向與 anti-pattern 清單，作為設計決策的依據。

---

### 使用順序

設計任何 UI 任務時，依序執行：

1. 讀取 UI UX Pro Max → 取得業界規範與推薦方向
2. 讀取 Frontend Design → 制定本次任務的具體設計計畫
3. 計畫通過自我審查後 → 開始實作

---

# 專案概覽

**Youtube 影片 摘要整理工具**：貼網址或關鍵字搜尋 YouTube 影片 → 抓字幕 → Claude 生成繁體中文摘要（含可跳轉時間戳）→ 可針對影片多輪問答 → 匯出 Markdown / Word / PDF。

- 線上版：https://youtube-summary-tools.vercel.app/
- GitHub：https://github.com/wenwenstudio218/youtube_summary_tools（push 到 `main` 自動部署 Vercel）
- 各功能都有設計文件：`docs/superpowers/specs/`（新功能沿用 brainstorming → 設計文件 → 實作的流程）

## 核心架構

- **技術棧**：Next.js 16（App Router）+ TypeScript、Tailwind CSS 4、Vitest。
- **分層（重要）**：
  - `lib/`：純邏輯，不碰 DOM、不依賴 HTTP 框架，全部可獨立單元測試（youtube、transcript、summarize、ask、search、duration、markdown、exports、text、time、errors、apiError、types）。
  - `app/api/*/route.ts`：薄薄的路由層，解析請求 → 呼叫 `lib` → 統一錯誤格式回應。
  - `components/`：React 元件（`SummarizerApp` 為主控狀態，其餘為呈現）。
- **mock / live 雙模式**：外部服務（Claude、Supadata、YouTube 搜尋）都做成雙模式，方便無金鑰 / 測試時跑假資料。
  - 摘要與 Q&A 看 `SUMMARIZE_MODE`（`mock` | `live`）。
  - 字幕與搜尋看「是否有對應金鑰」自動決定（有 `SUPADATA_API_KEY` / `YOUTUBE_API_KEY` 就走 live）。
  - `lib` 函式都接受可注入的 `client` / `fetchFn`，測試時注入假物件，不打真 API。
- **環境變數**（`.env.local`，勿提交；`.env.example` 為範本）：
  `ANTHROPIC_API_KEY`、`SUMMARIZE_MODE`、`ANTHROPIC_MODEL`（預設 `claude-haiku-4-5`）、`YOUTUBE_API_KEY`、`SUPADATA_API_KEY`。
- **統一錯誤處理**：`lib/errors.ts`（`AppError` + 錯誤碼）→ `lib/apiError.ts` 對應 HTTP 狀態 → 前端讀 `{ error: { code, message } }`。

## 關鍵功能實現（含容易踩的坑）

- **字幕**（`lib/transcript.ts`）：有 `SUPADATA_API_KEY` 時**優先用 Supadata**，失敗且非「無字幕」才回退 `youtube-transcript`。
  - ⚠️ `youtube-transcript` 在雲端（Vercel）會因 IP 被 YouTube 封鎖而抓不到字幕；**雲端務必靠 Supadata**。
  - ⚠️ 時間單位：Supadata 的 `offset` 是**毫秒**（需 /1000）；`youtube-transcript` 的 srv3 為毫秒、classic 為秒（用 `normalizeSegments` 以間隔中位數判斷）。**專案內時間戳一律以「秒」流通**。
- **摘要**（`lib/summarize.ts`）：Claude 結構化輸出（`output_config.format` json_schema），一次產出長/短兩版。回傳後在**源頭**做兩件事：去 Markdown（`stripMarkdown`）+ 依 timestamp 排序（Claude 回傳順序不保證遞增），因此畫面與所有匯出都乾淨且有序。
- **Q&A**（`lib/ask.ts`）：多輪對話（歷史由前端帶入），結構化輸出 `{ answer, citations }`，答案同樣在源頭去 Markdown。後端無狀態，每次重新抓字幕。
- **搜尋**（`lib/search.ts`）：`search.list`（篩選 → 參數）取 videoId + `videos.list` 補時長，合併為卡片；配額用罄回 `QUOTA_EXCEEDED`。
- **時間戳跳轉**：`components/VideoPlayer.tsx` 用 YouTube IFrame API，透過 ref 暴露 `seekTo`；摘要與 Q&A 的時間戳點擊都呼叫它。
- **匯出**（`components/ExportBar.tsx` + `lib/markdown.ts` / `lib/exports.ts`）：Markdown 為文字檔；Word 用 HTML 產 `.doc`；PDF 用列印視窗另存（**刻意選列印以避免 CJK 字型內嵌肥大**）。匯出的 HTML 維持淺色（列印用）。
- **深色模式**：`app/globals.css` 用 CSS 變數 + `.dark` class，`@theme` 以 `var()` 參照；新增 `oncolor` token 讓綠/紅底按鈕文字兩模式都維持淺色。`app/layout.tsx` 內嵌繪製前 script 防閃白，`ThemeToggle` 記憶 `localStorage`、首次跟隨系統。

## 未來維護注意事項

- **金鑰安全**：金鑰只在伺服器端使用、不外露瀏覽器；`.env*`（除 `.env.example`）已被 git 忽略，切勿提交真實金鑰。
- **Vercel 環境變數**：線上版的金鑰在 Vercel Settings → Environment Variables；**新增或修改環境變數後必須 Redeploy 才生效**。
- **額度**：Supadata 免費 100 次/月；YouTube Data API 每日約 100 次搜尋（`search.list` 每次 100 單位）；用罄會出現對應錯誤訊息。
- **測試**：改動 `lib` 邏輯務必同步更新 `*.test.ts`；提交前跑 `npm test`（目前 73 個）與 `npm run build`。
- **驗證**：涉及畫面 / 流程的變更，習慣用瀏覽器實測（本專案開發時以 Playwright 實機驗證各功能）。
- **部署**：`git push` 到 `main` 會自動觸發 Vercel 部署，不需手動操作。

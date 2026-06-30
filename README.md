# Youtube 影片 摘要整理工具

把一支 YouTube 影片，整理成一頁乾淨、可隨時跳轉的重點筆記。貼上網址或關鍵字搜尋，工具會抓取字幕、用 Claude 生成繁體中文摘要，並附上可點擊跳轉的時間戳；還能針對影片內容多輪問答，最後一鍵匯出 Markdown / Word / PDF。

**🔗 線上版：https://youtube-summary-tools.vercel.app/**

## 功能

- **搜尋 / 貼網址雙模式**
  - 關鍵字搜尋 YouTube 影片，可依「排序、上傳時間、影片長度」篩選，結果以卡片呈現（縮圖、時長、標題、頻道），支援「載入更多」
  - 也可直接貼上影片網址
- **AI 摘要**
  - 抓取影片字幕，交由 Claude 生成繁體中文重點，提供「短版 / 長版」切換
  - 每個重點標記時間戳，沿垂直時間軸排列；點擊時間戳，內嵌播放器直接跳轉
- **影片問答（Q&A）**
  - 針對影片逐字稿多輪提問，回答附可跳轉的引用時間戳
- **輸出**
  - 複製到剪貼簿、匯出 **Markdown / Word(.doc) / PDF**
- **深色模式**：跟隨系統、可手動切換、記憶偏好

## 技術棧

- [Next.js 16](https://nextjs.org/)（App Router）+ TypeScript
- Tailwind CSS 4
- [Anthropic Claude API](https://www.anthropic.com/)（摘要與問答，預設模型 `claude-haiku-4-5`）
- [YouTube Data API v3](https://developers.google.com/youtube/v3)（搜尋）
- YouTube oEmbed（影片資訊，免金鑰）＋ `youtube-transcript`（字幕）
- Vitest（單元測試）

## 本機啟動

需求：Node.js 18+（建議 20+）。

```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 填入金鑰（見下方說明）

# 3. 啟動開發伺服器
npm run dev
# 開啟 http://localhost:3000
```

### 環境變數

複製 `.env.example` 為 `.env.local` 後填入：

| 變數 | 說明 | 必填 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Claude API 金鑰，[Console 申請](https://console.anthropic.com/settings/keys) | live 模式必填 |
| `SUMMARIZE_MODE` | `mock`（假資料，免金鑰）或 `live`（呼叫 Claude） | 預設 `mock` |
| `ANTHROPIC_MODEL` | 使用的 Claude 模型 | 預設 `claude-haiku-4-5` |
| `YOUTUBE_API_KEY` | YouTube Data API v3 金鑰（搜尋功能使用） | 搜尋需填 |

> **不需要金鑰也能試玩**：維持 `SUMMARIZE_MODE=mock` 且不填 `YOUTUBE_API_KEY`，摘要與搜尋會回傳假資料，可先體驗整體流程與介面。填入金鑰後即自動切換為真實資料。

### 指令

```bash
npm run dev      # 開發伺服器
npm run build    # 正式建置
npm start        # 啟動正式版
npm test         # 執行單元測試
npm run lint     # ESLint 檢查
```

## 專案結構

```
app/
  page.tsx              首頁（header / 主畫面 / footer）
  layout.tsx           字型、主題防閃白 script
  api/
    metadata/          影片資訊（oEmbed）
    summarize/         抓字幕 + 生成摘要
    ask/               影片問答
    search/            YouTube 搜尋
lib/                   純邏輯（可獨立測試）
  youtube · transcript · summarize · ask · search · duration · markdown · exports · text · time
components/            React 元件（SummarizerApp、SearchPanel、SummaryPanel、QAPanel、VideoPlayer…）
docs/superpowers/specs/  各功能設計文件
```

## 運作方式

1. 取得 `videoId`（解析網址或搜尋結果）
2. 後端並行抓取影片資訊（oEmbed）與字幕（`youtube-transcript`）
3. 字幕＋時間戳交給 Claude，產出結構化的繁中摘要（長/短兩版，附時間戳）
4. 前端以時間軸呈現；時間戳透過 YouTube IFrame API 跳轉播放器
5. 問答時同樣以逐字稿為依據，多輪對話歷史隨請求送出

金鑰只在伺服器端使用，不會外露到瀏覽器。

## 後續規劃

- 匯出整合 Notion / 筆記軟體
- 無字幕影片的語音轉文字（Whisper）備援
- 搜尋結果分享網址、Q&A 串流逐字顯示

---

由 [Claude Code](https://claude.com/claude-code) 協作開發。

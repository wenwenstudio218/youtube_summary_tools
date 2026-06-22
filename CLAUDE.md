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

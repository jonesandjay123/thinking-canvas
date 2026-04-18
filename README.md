# Thinking Canvas

一個屬於 Jones 的可視化思考工作台。

Thinking Canvas 是一個以 repo 為基礎、可由 agent 協作操作的想法空間。它會先從類似心智圖的互動方式開始，但從一開始就保留未來成長成更豐富思考系統的可能性。

## 目前專案狀態

這個 repo 現在正處於 *v0 啟動階段*。

當前最重要的目標不是做出完整知識圖譜系統，而是：

> *明天先上 Firebase，做出一個可以實際打開、編輯、操作的初版。*

也就是說，接下來所有架構與實作決策，都應該優先服務這個目標。

## 這個專案為什麼存在

這個專案其實是三條已經被驗證過的路線，慢慢匯流出來的結果：

1. *IdeaCanvas* 證明了一個很好的互動模式，也就是「可編輯的視覺化節點 + AI 協助局部發散」。
2. *trip-planner* 證明了一個很重要的架構模式，也就是 Jarvis 不只是聊天，而是真的可以透過 SDK 直接修改底層結構化資料。
3. *thinking_with_ai* 證明了 Jones 的真實工作習慣，也就是會持續把想法寫進 repo，長期累積、重組、複利成長。

Thinking Canvas 想做的，就是把這三件事接起來，變成一個真正可長期使用的系統：

- 可視化
- 可編輯
- 可結構化保存
- 可由 Jarvis 協作操作
- 適合長期累積與重組

## 當前明確方向

### 1. 先不要做 Python backend
目前不做 Python backend。

原因不是永遠不用，而是現在最需要的是：
- 先把畫布做出來
- 先把資料模型定清楚
- 先把 CRUD 跑順
- 先能部署、能玩、能讓 Jarvis 操作

Python 比較像後期才需要出場的角色，例如：
- 批次匯入大量 corpus
- 關係抽取
- embeddings / retrieval
- graph enrichment
- background jobs

### 2. 先做前端主體
目前 v0 / v0.5 的核心技術方向：
- React + Vite
- TypeScript
- 本地 sample data 起步
- 很快接 Firebase Hosting
- 接著補 Firestore persistence

### 3. LLM 不是現在的阻塞點
AI 功能不是第一步。

第一步先把人能用、Jarvis 能操作、資料能保存的骨架搭好。
之後若要接 Gemini：
- prototype 可短期直連測試
- 正式使用應走 serverless proxy
- 不把正式金鑰放在前端

## 產品工作定義

Thinking Canvas 不只是筆記 app，也不只是心智圖。

它更像是一個屬於 Jones 的思考工作台，在這裡想法可以被：
- 建立
- 展開
- 重組
- 連接
- 保存
- 由 Jones 與 Jarvis 協作操作

## v0 成功條件

如果明天要說 v0 成功，至少應該做到：

- 可以打開一個網頁版 Thinking Canvas
- 可以看到一份 sample canvas
- 可以新增節點
- 可以編輯節點
- 可以刪除節點
- 資料結構清楚，不是 UI 裡亂塞 state
- 專案可部署到 Firebase Hosting

如果還能做到這些，就更好：
- local persistence
- 基本拖曳或節點位置編輯
- 預留 Firestore 對接點

## 設計原則

### 1. 人主導，AI 增強
方向由人決定。
AI 負責協助發散、整理、重組、補充、維護結構。

### 2. 結構比聊天紀錄重要
重要想法應該變成可保存的節點，而不是散落在聊天訊息裡。

### 3. UI 與 Agent 都能操作
這是核心要求。
這套資料層必須同時適合 Jones 自己操作，也適合 Jarvis 穩定讀寫。

### 4. 互動上 tree-first，設計上 graph-ready
前期 UI 可以用 tree-like 的方式切入，因為比較直觀、好做、好理解。
但設計時不要把系統永遠限制在只有父子節點的世界。

### 5. Repo-backed thinking
這個專案的資料、結構、演進，都應該保持在 Jones 自己能理解、能掌控、能版本追蹤的範圍內。

## 當前推薦技術路線

### 前端
- React
- Vite
- TypeScript

### 資料層
- 先用本地 JSON / in-memory sample data 起步
- schema 要明確
- store 要獨立
- 不把資料邏輯散在 component 裡

### 部署
- 明天優先目標：Firebase Hosting
- Firestore 可以在初版可玩後接上

### 後續 AI 層
- 正式金鑰不放前端
- 後續用 serverless proxy 承接

## 初步資料模型方向

目前設計方向是：
- UI 先以 tree-like 互動為主
- 資料層保留 graph-ready 空間

建議 node schema 至少包含：
- `id`
- `canvasId`
- `title`
- `content`
- `childIds`
- `parentId`（v0 先單親）
- `links`
- `tags`
- `type`
- `position`
- `createdAt`
- `updatedAt`

建議 canvas schema 至少包含：
- `id`
- `title`
- `rootNodeId`
- `createdAt`
- `updatedAt`

## 專案結構

```text
thinking-canvas/
├── README.md
├── docs/
│   ├── architecture-notes.md
│   ├── product-direction.md
│   ├── roadmap.md
│   └── handoff-guide.md
├── src/
│   ├── data/
│   ├── lib/
│   └── types/
```

## 必讀文件順序

如果是 Jones、Jarvis、或任何後續接手的 agent，要先看：

1. `README.md`
2. `docs/roadmap.md`
3. `docs/handoff-guide.md`
4. `docs/architecture-notes.md`

這四份讀完後，應該要能無腦接著做，不需要重新猜方向。

## 立即下一步

請直接照 `docs/roadmap.md` 執行。

最優先的不是延伸討論，而是：
1. 建 React/Vite scaffold
2. 寫清楚 TypeScript schema
3. 做最小 canvas UI
4. 讓 sample data 能被渲染與編輯
5. 準備 Firebase Hosting 部署

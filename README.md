# Thinking Canvas

一個屬於 Jones 的可視化思考工作台。

Thinking Canvas 是一個以 repo 為基礎、可由 agent 協作操作的想法空間。它已經從最初的心智圖式 prototype，進入一個更明確的方向：不只要能互動，還要能保存、搬移、累積，慢慢長成真正的思考系統。

## 目前專案狀態

這個 repo 現在已經有一個可操作的本地版本基底，包含：

- React + Vite + TypeScript app
- React Flow 畫布
- 節點新增、編輯、刪除、拖曳
- 本地 `localStorage` persistence
- 控制面板（方位流向、節點形狀、大小、文字大小）
- Gemini prototype 節點展開

所以目前最重要的目標，不再只是「把畫布 render 出來」，而是：

> *先把本地 persistence / save-format thinking 這一段收斂完整，再往 export/import 與 Firebase 前進。*

## 這個專案為什麼存在

這個專案其實是三條已經被驗證過的路線，慢慢匯流出來的結果：

1. *IdeaCanvas* 證明了一個很好的互動模式，也就是「可編輯的視覺化節點 + AI 協助局部發散」。
2. *trip-planner* 證明了一個很重要的架構模式，也就是 Jarvis 不只是聊天，而是真的可以透過結構化資料直接操作內容。
3. *thinking_with_ai* 證明了 Jones 的真實工作習慣，也就是會持續把想法寫進 repo，長期累積、重組、複利成長。

Thinking Canvas 想做的，就是把這三件事接起來，變成一個真正可長期使用的系統：

- 可視化
- 可編輯
- 可結構化保存
- 可由 Jarvis 協作操作
- 適合長期累積與重組

## 當前明確方向

### 1. 前端主體已成立
目前核心技術方向已經確立：
- React + Vite
- TypeScript
- React Flow
- 本地 sample data + localStorage persistence

### 2. localStorage 是 workspace persistence，不是最終存檔格式
目前 app 已經使用 browser `localStorage` 保存工作現場，這很適合本地延續使用。

但這不應直接等同於未來正式的匯出匯入格式。

目前建議分三層思考：
- runtime state
- workspace persistence
- portable save format

詳見：`docs/storage-architecture.md`

正式的匯出匯入格式草案見：`docs/save-file-spec-v1.md`

### 3. document 與 presentation 要分開思考
Thinking Canvas 的資料未來不只要分 `document` 和 `ui`，更適合往這種方向整理：
- `document`: 真正的思考內容
- `presentation`: 這張圖如何被呈現
- `user preference`: 使用者環境偏好（未來可再決定是否獨立）

### 4. Firebase 仍然重要，但不是這一刻唯一優先
Firebase / Firestore 仍然是合理的下一段，但現階段更重要的是先把：
- 本地 persistence
- save-file spec thinking
- import/export 概念邊界

定清楚，避免之後雲端資料結構重來。

## 產品工作定義

Thinking Canvas 不只是筆記 app，也不只是心智圖。

它更像是一個屬於 Jones 的思考工作台，在這裡想法可以被：
- 建立
- 展開
- 重組
- 連接
- 保存
- 由 Jones 與 Jarvis 協作操作

## 當前本地里程碑

如果要說「目前這段做到一個可以先停的本地段落」，至少應該包含：

- 本地畫布可正常操作
- 本地 persistence 穩定
- 文件清楚描述 storage architecture
- save-file v1 的方向被定義清楚
- 下一步 export/import 與 Firestore 不需要重新猜

## 設計原則

### 1. 人主導，AI 增強
方向由人決定。
AI 負責協助發散、整理、重組、補充、維護結構。

### 2. 結構比聊天紀錄重要
重要想法應該變成可保存的節點，而不是散落在聊天訊息裡。

### 3. UI 與 Agent 都能操作
這是核心要求。
這套資料層必須同時適合 Jones 自己操作，也適合 Jarvis 穩定讀寫。

### 4. tree-first，graph-ready
前期互動仍以 tree-like 為主，但資料設計不要把未來永遠鎖死在單一父子世界。

### 5. 先分清楚 persistence 層次，再談雲端
不要把 runtime state、local persistence、export file、雲端 document 混在一起。

## 當前資料模型方向

目前 schema 主幹至少包含：

### Canvas
- `id`
- `title`
- `rootNodeId`
- `createdAt`
- `updatedAt`

### ThoughtNode
- `id`
- `canvasId`
- `title`
- `content`
- `childIds`
- `parentId`
- `links`
- `tags`
- `type`
- `position`
- `isExpanded`
- `createdAt`
- `updatedAt`

## 本地開發與 Gemini prototype 使用方式

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動本地開發

```bash
npm run dev
```

### 3. 啟用 Gemini prototype（選用）

先把 `.env.example` 複製成 `.env.local`：

```bash
cp .env.example .env.local
```

然後填入自己的 key，例如：

```bash
VITE_GEMINI_API_KEY=你的_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.5-flash
```

之後重新啟動開發伺服器：

```bash
npm run dev
```

### 4. 目前 Gemini 能做什麼

目前 v0 prototype 的 Gemini 功能是：

- 對單一節點按下 `✨`
- 根據整張畫布的上下文
- 為該節點產生數個子節點建議
- 並直接新增進畫布

### 5. 重要提醒

目前這是 *prototype 用法*。
`VITE_GEMINI_API_KEY` 屬於前端環境變數，適合本地測試，不適合正式公開部署。

如果之後要公開部署，應改成：
- 前端保留畫布 UI
- Gemini key 改放在 serverless proxy / Firebase Functions
- 不把正式金鑰暴露在前端

## 專案結構

```text
thinking-canvas/
├── README.md
├── docs/
│   ├── architecture-notes.md
│   ├── handoff-guide.md
│   ├── product-direction.md
│   ├── roadmap.md
│   └── storage-architecture.md
├── src/
│   ├── components/
│   ├── data/
│   ├── lib/
│   └── types/
```

## 必讀文件順序

如果是 Jones、Jarvis、或任何後續接手的 agent，要先看：

1. `README.md`
2. `docs/roadmap.md`
3. `docs/storage-architecture.md`
4. `docs/handoff-guide.md`
5. `docs/architecture-notes.md`

這幾份讀完後，應該要能直接接著做，不需要重新猜方向。

## 立即下一步

目前最合理的下一步是：
1. 依 `docs/save-file-spec-v1.md` 做最小 export/import
2. 補 import validation
3. 補 localStorage migration / recovery thinking
4. 再決定 Firestore 映射方式

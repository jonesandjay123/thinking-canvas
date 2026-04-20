# Storage Architecture

## 為什麼現在要更新這份

Thinking Canvas 已經不再只是「本地互動畫布 prototype」。
它現在同時擁有：

- 本地工作現場延續
- 正式匯出 / 匯入格式
- 最小 Firestore 雲端 persistence
- 薄層 autosave

所以這份文件現在不只是在講 localStorage，也是在定義 local 與 cloud 的責任邊界。

## 三層模型

### 1. Runtime state
這是 app 當下互動中的短生命狀態。

例子：
- hover 到哪個 node
- 哪個 node 正在 drag
- 哪個 input 正在 focus
- Gemini loading 狀態
- React Flow viewport 過渡狀態
- autosave timer / suppress flag

原則：
- 不進 export/import 檔案
- 不當正式保存格式
- 可以在 reload 後消失

### 2. Workspace persistence
這是「同一台裝置、同一個瀏覽器，下次打開還想延續工作現場」的層。

目前由 `localStorage` 承擔。

現況：
- `thinking-canvas-document` 儲存畫布 document
- `thinking-canvas-ui` 儲存主要 UI / presentation 設定

原則：
- 可接近 app runtime 結構
- 重點是方便單機延續工作
- 不應直接當成可分享、可版本化的正式 save file

### 3. Cloud persistence
這是「跨裝置、跨 session 仍能保留畫布」的層。

目前由 Firestore 承擔最小版本。

路徑：

```text
users/{uid}/canvases/{canvasId}
```

目前欄位：

- `ownerUid`
- `title`
- `document`
- `presentation`
- `updatedAt`

原則：
- 先追求單人 owner-only 可用
- 不先做多人協作
- 不先拆 node subcollection
- 不先做 version history

## 不只 document / ui，而是 document / presentation / user preference

目前最自然的切法不是單純 `document` 與 `ui` 二分，而是至少在概念上區分：

### document
真正的思考內容資產。

應包含：
- canvas id
- title
- rootNodeId
- nodes
- parent / child 關係
- links
- tags
- content
- position
- createdAt / updatedAt

### presentation
這張畫布希望如何被呈現。

目前 Thinking Canvas 中，比較接近這層的有：
- flowDirection
- nodeShape
- nodeSize
- nodeTextScale

### user preference
更偏向使用者個人環境偏好。

目前仍然保留為較弱的概念層，未來若真的有需求再拆：
- theme
- controlDock
- panel 開合習慣

## 目前 localStorage 現況

目前除了保存之外，也已經補上最小 recovery：

- 載入時先 normalize
- document 結構不合法時清除該 key 並 fallback 到 sample canvas
- `reset()` 會同時清除 document 與 UI settings

目前實作為：

- `thinking-canvas-document`
  - `CanvasDocument` JSON 字串
- `thinking-canvas-ui`
  - AI 展開數量
  - flowDirection
  - nodeShape
  - nodeSize
  - nodeTextScale
  - theme
  - controlDock

## 目前 autosave 的責任邊界

autosave 不是新的 storage layer，它只是：

> **把本地穩定狀態，延遲同步到雲端。**

目前行為：

- localStorage 仍然即時保存
- Firestore autosave debounce 1500ms
- 僅對 owner + 已登入啟用
- 手動 Save to Cloud 仍保留
- Load from Cloud 後 suppress 下一次 autosave

這代表：

- local 承擔即時草稿責任
- cloud 承擔跨裝置 persistence 責任
- autosave 承擔「不要一直要人手動按 save」的協調責任

## 未來建議的 save-file v1 方向

正式匯出格式仍維持：

```json
{
  "app": "thinking-canvas",
  "version": 1,
  "exportedAt": "2026-04-19T19:00:00.000Z",
  "document": {},
  "presentation": {}
}
```

這一層仍應獨立於 localStorage 與 Firestore 內部實作。

## 哪些不該進正式 save file

先不要放：

- hover node id
- selected node id
- drag in progress 狀態
- loading 狀態
- autosave timer / autosave state
- 暫時性 viewport transition
- Gemini 暫存結果
- API key 相關資訊

## Runtime schema 與 export schema 不必相同

這點仍然重要。

目前 app runtime 使用：
- `nodes: Record<string, ThoughtNode>`

未來 export schema 不一定必須永遠長得一樣。
關鍵是：
- 有明確 conversion
- 有明確 version
- 有 migration thinking

## 與 Firestore 的未來對接

現在 Firestore 已經先採「整包 document 存一筆」的策略，這對目前單人專案是正確的。

未來何時再拆，需要真的出現以下需求才考慮：

- 單張 canvas 過大
- 需要多人協作
- 需要 node-level history
- 需要局部同步

在那之前，整包 document + presentation 是最穩的作法。

## 目前結論

今天的 storage 架構可以收斂成一句：

> **local 即時，cloud 延遲，format 獨立，先穩再擴。**

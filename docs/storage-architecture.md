# Storage Architecture

## 為什麼現在要先定這份

Thinking Canvas 已經不是單純的互動畫布 prototype 了。
它開始碰到真正的「保存」問題，也就是：

- 內容要怎麼保存
- 畫面呈現要怎麼保存
- 本地暫存、正式存檔、未來雲端資料要怎麼切開

目前專案已經用 `localStorage` 做本地 persistence，但這不應直接等同於最終的存檔格式。

## 三層模型

### 1. Runtime state
這是 app 當下互動中的短生命狀態。

例子：
- hover 到哪個 node
- 哪個 node 正在 drag
- 哪個 input 正在 focus
- Gemini loading 狀態
- React Flow viewport 過渡狀態

原則：
- 不進 export/import 檔案
- 不當正式保存格式
- 可以在 reload 後消失

### 2. Workspace persistence
這是「同一台裝置、同一個瀏覽器，下次打開還想延續工作現場」的層。

目前由 `localStorage` 承擔。

現況：
- `thinking-canvas-document` 儲存畫布 document
- `thinking-canvas-ui` 儲存控制面板相關偏好

原則：
- 可接近 app runtime 結構
- 重點是方便單機延續工作
- 不應直接當成可分享、可版本化的正式 save file

### 3. Portable save format
這是未來 export/import 要用的正式存檔格式。

原則：
- 必須 versioned
- 必須可驗證
- 必須可 migration
- 不應被目前 React / localStorage 內部結構綁死

## 不只 document / ui，而是 document / presentation / user preference

目前最自然的切法不是單純 `document` 與 `ui` 二分，而是至少先在概念上區分：

### document
真正的思考內容資產。

應包含：
- canvas id
- title
- rootNodeId
- nodes
- parent/child 關係
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

這些欄位不完全只是個人 UI 偏好，它們也會影響作品被觀看時的外觀。

### user preference
更偏向使用者個人環境偏好。

但因為這個專案目前只服務 Jones 一人，所以暫時不需要特地把這層產品化。
目前保留成概念上的區分即可，未來真的有痛點再拆：
- theme
- default zoom behavior
- panel 開合習慣

## 目前 localStorage 現況

目前除了保存之外，也已經補上最小 recovery：
- 載入時先 normalize
- document 結構不合法時清除該 key 並 fallback 到 sample canvas
- `reset()` 會同時清除 document 與 UI settings


當前實作是：

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

這對本地 persistence 很夠用，也讓今天的開發能持續推進。

## 未來建議的 save-file v1 方向

建議之後的正式匯出格式長這樣：

```json
{
  "app": "thinking-canvas",
  "version": 1,
  "exportedAt": "2026-04-19T19:00:00.000Z",
  "document": {},
  "presentation": {}
}
```

### 最低限度欄位

#### top-level
- `app`
- `version`
- `exportedAt`
- `document`
- `presentation`

#### document
- `canvas`
- `nodes`

#### presentation
- `flowDirection`
- `nodeShape`
- `nodeSize`
- `nodeTextScale`

## 哪些不該進正式 save file

先不要放：
- hover node id
- selected node id
- drag in progress 狀態
- loading 狀態
- 暫時性 viewport transition
- Gemini 暫存結果
- API key 相關任何資訊
- 畫面上短期可還原但非核心的暫態 UI

## Runtime schema 與 export schema 不必相同

這點很重要。

目前 app runtime 適合用：
- `nodes: Record<string, ThoughtNode>`

未來 export schema 不一定非得完全相同。
它可以維持相同結構，也可以轉成更適合跨系統交換與驗證的格式。

關鍵不是「兩者一樣」，而是：
- 有明確 conversion
- 有明確 version
- 有 migration 策略

## Migration 要想兩種

概念上可以分成兩種，但這個專案目前是 Jones 單人使用，不是多人 SaaS。
所以現階段不需要做重型 migration framework。

### 1. localStorage migration
目前做法以 normalize + invalid fallback 為主，夠用就好。
如果未來欄位有小變動，優先考慮一次性轉換或直接由 agent / LLM 協助轉換。

### 2. save-file migration
目前保留 version 與錯誤提示即可。
未來若 schema 有明顯變動，再做小型、客製化的轉換即可，不必預先做複雜升級鏈。

## 建議的近期順序

### 本地段落先完成
1. 穩定 localStorage persistence
2. 文件寫清楚三層模型
3. 定 save file spec v1 草案

### 接著再做
4. 補更完整的 migration 設計
5. 決定是否納入 user preference 存檔層
6. 決定 Firestore 映射草案

### 最後才接
7. Firebase / Firestore 實作

## 與 Firestore 的未來對接

未來不建議把所有資料原封不動塞成單一 blob 而不加思考。

建議方向：
- document 作為主要雲端內容資產
- presentation 視需求跟著 canvas 走
- user preference 視需求獨立成 user scope

等本地段落穩定後，再決定 Firestore 要：
- 先整包 document 存一筆
- 或切成 canvas metadata + node collection

## 目前結論

今天的重點不是一次把雲端做完，而是先把本地 persistence 與 save-format thinking 定清楚。

做到這個段落後，Thinking Canvas 才算真的跨過「只是畫布 UI」的分水嶺，開始變成一個有保存觀念的思考系統。

# Thinking Canvas Save File Spec v1

## 文件目的

這份文件定義 Thinking Canvas 未來 export/import 使用的正式存檔格式草案。

它不是 app runtime state，也不是 localStorage 內部格式。
它是 *portable save format*，目標是：

- 可匯出
- 可匯入
- 可版本化
- 可驗證
- 未來可 migration

## 設計原則

### 1. 不把 localStorage 直接當正式存檔格式
`localStorage` 目前扮演的是 workspace persistence。

正式 save file 必須獨立於：
- React component state
- React Flow runtime state
- localStorage 目前欄位長相

### 2. 內容與呈現要分開
save file v1 至少分成：
- `document`
- `presentation`

目前先不把 `userPreference` 放進 v1 必填結構。
如果未來需要，再往後加。

### 3. 版本優先
所有正式 save file 都必須包含：
- `app`
- `version`
- `exportedAt`

其中 `version` 是 migration 的基礎。

## v1 top-level 結構

```json
{
  "app": "thinking-canvas",
  "version": 1,
  "exportedAt": "2026-04-19T19:10:00.000Z",
  "document": {},
  "presentation": {}
}
```

## Top-level 欄位定義

### `app`
- 型別：`string`
- v1 固定值：`"thinking-canvas"`
- 用途：辨識這份檔案屬於哪個 app

### `version`
- 型別：`number`
- v1 固定值：`1`
- 用途：辨識 schema 版本

### `exportedAt`
- 型別：`string`
- 格式：ISO 8601 timestamp
- 用途：記錄匯出時間

### `document`
- 型別：`object`
- 用途：保存真正的思考內容

### `presentation`
- 型別：`object`
- 用途：保存這張畫布如何被呈現

## `document` 結構

v1 建議如下：

```json
{
  "canvas": {
    "id": "canvas-main",
    "title": "Thinking Canvas",
    "rootNodeId": "root",
    "createdAt": "2026-04-19T18:00:00.000Z",
    "updatedAt": "2026-04-19T19:05:00.000Z"
  },
  "nodes": {
    "root": {
      "id": "root",
      "canvasId": "canvas-main",
      "title": "Jones",
      "content": "",
      "childIds": ["n1", "n2"],
      "parentId": null,
      "links": [],
      "tags": [],
      "type": "root",
      "position": { "x": 0, "y": 0 },
      "isExpanded": true,
      "createdAt": "2026-04-19T18:00:00.000Z",
      "updatedAt": "2026-04-19T19:05:00.000Z"
    }
  }
}
```

## `document.canvas` 欄位

### 必填
- `id: string`
- `title: string`
- `rootNodeId: string`
- `createdAt: string`
- `updatedAt: string`

## `document.nodes` 欄位

v1 先採用：
- `Record<string, ThoughtNode>`

原因：
- 與目前 app runtime 結構接近
- 匯入匯出 conversion 成本較低
- 對本地段落最務實

未來如果需要更跨系統、array-friendly 的交換格式，可在 v2 再討論。

### 每個 node 必填欄位
- `id: string`
- `canvasId: string`
- `title: string`
- `content: string`
- `childIds: string[]`
- `parentId: string | null`
- `links: string[]`
- `tags: string[]`
- `type: 'root' | 'idea' | 'project' | 'principle' | 'note'`
- `position: { x: number; y: number }`
- `createdAt: string`
- `updatedAt: string`

### 每個 node 可選欄位
- `isExpanded?: boolean`

## `presentation` 結構

v1 建議如下：

```json
{
  "flowDirection": "TB",
  "nodeShape": "circle",
  "nodeSize": 160,
  "nodeTextScale": 20
}
```

### 必填欄位
- `flowDirection: 'TB' | 'BT' | 'LR' | 'RL'`
- `nodeShape: 'circle' | 'ellipse' | 'rounded-rect' | 'rounded-square'`
- `nodeSize: 80 | 120 | 160 | 200`
- `nodeTextScale: 12 | 14 | 16 | 20 | 24 | 28 | 32`

## v1 明確不納入的欄位

以下不應放入 save file v1：

### runtime-only
- hover node id
- selected node id
- drag in progress 狀態
- loading state
- input focus state
- viewport transition 狀態

### app internals
- Gemini response 暫存內容
- API keys
- provider config
- debug flags

### 暫緩決定
- theme
- sidebar open/closed
- controlDock
- viewport zoom / pan snapshot

這些欄位之後若要納入，應明確判斷它屬於：
- presentation
- user preference
- runtime only

## 匯入 validation 最低規則

v1 匯入時至少要驗證：

### top-level
- `app === 'thinking-canvas'`
- `version === 1`
- `exportedAt` 為字串
- `document` 存在
- `presentation` 存在

### document
- `canvas.id` 存在
- `canvas.rootNodeId` 存在
- `nodes` 為 object
- `rootNodeId` 必須能在 `nodes` 中找到

### nodes integrity
- 每個 node 的 key 與 `node.id` 一致
- `childIds` 中的 id 必須存在
- `parentId` 若非 null，必須存在
- 所有 node 的 `canvasId` 應一致

### enums
- `flowDirection` 必須合法
- `nodeShape` 必須合法
- `nodeSize` 必須合法
- `nodeTextScale` 必須合法

## Migration 原則

### localStorage migration
本地 localStorage 演進時，應由 app 啟動時做 normalize。

### save-file migration
未來若 v2 出現：
- 匯入時先看 `version`
- 若舊版可升級，先 migration 再讀入
- 若無法升級，至少顯示清楚錯誤訊息

## 與 localStorage 的關係

目前 localStorage 仍然是：
- `thinking-canvas-document`
- `thinking-canvas-ui`

v1 save file 與 localStorage 不要求欄位完全一致。
但兩者應可透過明確 conversion 互相轉換。

## 與未來 Firestore 的關係

v1 save file 的目的不是直接決定 Firestore 最終 schema。

但它會提供穩定的內容邊界，讓之後比較容易決定：
- 哪些欄位屬於 document
- 哪些欄位屬於 presentation
- 哪些欄位應留在 user scope

## 當前結論

Thinking Canvas Save File Spec v1 的核心判斷是：

- localStorage 是 workspace persistence
- save file 是正式可搬移資產
- v1 先採 `document + presentation`
- 先追求簡單、清楚、可驗證、可演進

這份 spec 是接下來最小 export/import 的基礎。

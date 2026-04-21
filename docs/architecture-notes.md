# Architecture Notes

## 當前技術判斷

### 結論

- 前端主體已成立
- React Flow 已作為主畫布層
- localStorage 已作為 workspace persistence
- Firestore 已接上最小雲端 persistence
- autosave 已做成薄層，不再只靠手動 save
- 目前最重要的事不是再擴 feature，而是守住穩定資料流

## 架構原則

### 1. UI、操作、資料層仍然分開
目前主要主幹仍然是：

- `src/types/canvas.ts`
- `src/lib/store.ts`
- `src/lib/actions.ts`
- `src/lib/cloud.ts`
- `src/components/FlowCanvas.tsx`

這個分層必須繼續保持。

### 2. React Flow 是畫布層，不是資料真相來源
React Flow 解決的是：

- 節點渲染
- edge rendering
- zoom / pan / controls
- 拖曳互動

但真正資料模型仍應由 app 自己掌握，不應交給 React Flow 內部 state 決定。

### 3. Zustand 現在是共享前端狀態層
之前使用 custom hook + local state 時，auth / cloud / flow 互相干擾導致 feedback loop。

目前已改為 Zustand，作為單一前端共享狀態來源。

### 4. local 與 cloud 是兩層，不要混成一層
目前的分工是：

- localStorage：即時、穩定、單機工作現場延續
- Firestore：延遲同步、跨裝置 persistence

這個分層是刻意設計，不是暫時妥協。

### 5. autosave 要保持薄層
目前 autosave 不進 store 核心，而是在 `App.tsx` 以產品層行為協調：

- 追蹤 document + presentation 變動
- debounce 1500ms
- owner + 已登入才啟用
- 手動 save 仍保留
- cloud load 後 suppress 下一次 autosave

## 目前 schema 現況

### Canvas

```ts
interface Canvas {
  id: string
  title: string
  rootNodeId: string
  createdAt: string
  updatedAt: string
}
```

### Node

```ts
interface ThoughtNode {
  id: string
  canvasId: string
  title: string
  content: string
  childIds: string[]
  parentId: string | null
  links: string[]
  tags: string[]
  type: 'root' | 'idea' | 'project' | 'principle' | 'note'
  position: { x: number; y: number }
  isExpanded?: boolean
  createdAt: string
  updatedAt: string
}
```

## Persistence 現況

### localStorage keys
- `thinking-canvas-document`
- `thinking-canvas-ui`

### 目前 UI persistence 範圍
- AI 展開數量
- controlDock
- theme
- flowDirection
- nodeTextScale
- nodeShape
- nodeSize

### Firestore record 現況

路徑：

```text
users/{uid}/canvases/{canvasId}
```

欄位：

- `ownerUid`
- `title`
- `document`
- `presentation`
- `updatedAt`

## 近期最重要的技術問題

1. autosave UX 要不要再 polish
2. Firestore rules 是否要補欄位型別與資料完整性檢查
3. AI 展開時的 loading feedback 要如何更清楚、更有存在感
4. Gemini prompt 是否要納入 sibling context，避免同層發想重複
5. Firebase Hosting / production env 如何收斂
6. multiple canvases 要如何進場

## 關於 sibling context 的當前判斷

目前資料結構已經足夠支援這件事，不需要因為 sibling context 提前做複雜優化。

原因：
- `ThoughtNode` 已經有 `parentId`
- parent node 已經有 `childIds`
- 要找同層 sibling，只需要透過 parent 的 `childIds` 過濾當前 node 自己即可

以 Jones 單人使用、節點量大概率不到上千的前提，這個查詢成本完全可以接受。
目前更合理的做法是：

- 先把 sibling titles / content 納入 prompt context
- 先觀察生成品質是否明顯提升
- 等真的出現資料量或效能問題，再決定是否需要額外索引

## 與 Firebase 的關係

Firebase / Firestore 現在已經不是「下一步」，而是「已經接上但仍故意維持最小」。

Gemini 也已經完成 server-side 化，現況是透過 Firebase Functions 2nd gen + Secret Manager 呼叫，前端不再持有 Gemini API key。這次落地也確認了一個重要運維事實：若 deploy 成功但瀏覽器呼叫失敗，應優先檢查底層 Cloud Run invoker 權限，而不要先被表面的 CORS 訊息誤導。

比較穩的後續順序是：

1. autosave UX 穩定
2. Firestore rules 補強
3. metadata 補強
4. Firebase Hosting / production 收尾
5. 多 canvas 能力

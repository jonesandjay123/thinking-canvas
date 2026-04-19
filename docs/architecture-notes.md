# Architecture Notes

## 當前技術判斷

### 結論
- 前端主體已成立
- React Flow 已作為主畫布層
- localStorage 已作為目前的 workspace persistence
- 下一步優先是 storage architecture 與 save-file thinking，而不是急著直接綁死雲端資料結構

## 架構原則

### 1. UI、操作、資料層仍然分開
目前專案已具備以下主幹：
- `src/types/canvas.ts`
- `src/lib/store.ts`
- `src/lib/actions.ts`
- `src/components/FlowCanvas.tsx`

這個分層應繼續保持。

### 2. React Flow 是畫布層，不是資料模型
React Flow 解決的是：
- 節點渲染
- edge rendering
- zoom / pan / controls
- 拖曳互動

但真正資料模型仍應由 app 自己掌握，而不是被 React Flow shape 綁死。

### 3. storage architecture 要明確分層
目前建議明確分成三層：
- runtime state
- workspace persistence（目前是 localStorage）
- portable save format（未來 export/import）

詳見：`docs/storage-architecture.md`

### 4. document 與 presentation 要分開思考
目前已可確認：
- document 是核心思考內容
- presentation 是這張畫布如何被呈現

未來 user preference 是否獨立，可在 export/import spec 階段再決定。

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

## 近期最重要的技術問題

1. localStorage migration 要不要補
2. save-file v1 要不要沿用 runtime shape
3. export/import validation 怎麼做最小可用版本
4. presentation 與 user preference 邊界怎麼切

## 與 Firebase 的關係

Firebase / Firestore 仍然是合理方向，但現在不應搶在 schema thinking 前面。

比較穩的順序是：
1. 本地 persistence 穩定
2. save-file spec 清楚
3. export/import 最小可用
4. 再做 Firestore 映射

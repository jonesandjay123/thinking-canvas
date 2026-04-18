# Architecture Notes

## v0 技術判斷

### 結論
- 前端主體優先
- 暫不引入 Python backend
- 明天以 Firebase Hosting 可部署為主
- Firestore 預留接口，但不必今天就做完

## 架構原則

### 1. Spec repo 要變成可跑 app repo
目前 repo 已經有產品方向與 sample data。
下一步不能再只加文件，必須補出最小可執行 app。

### 2. Schema 要比現在更明確
目前 sample data 已經有方向，但需要升級成更正式的 schema。

建議拆成兩層：
- Canvas
- Node

### 3. Component 不要直接綁死資料結構
資料層、操作層、畫面層要分開。

建議至少有：
- `src/types/canvas.ts`
- `src/lib/store.ts`
- `src/lib/actions.ts`
- `src/components/*`

### 4. Agent action surface 要早點定義
這專案的重點不只是 UI，而是 Jarvis 也能穩定操作。

建議至少定義以下 action：
- `createNode`
- `updateNode`
- `deleteNode`
- `moveNode`
- `attachChild`
- `detachChild`
- `addLink`
- `removeLink`

AI 相關 action 可晚一點再補：
- `expandNodeWithAI`
- `summarizeSubtree`
- `suggestLinks`

## 建議 schema

### Canvas
```ts
interface Canvas {
  id: string;
  title: string;
  rootNodeId: string;
  createdAt: string;
  updatedAt: string;
}
```

### Node
```ts
interface ThoughtNode {
  id: string;
  canvasId: string;
  title: string;
  content: string;
  childIds: string[];
  parentId: string | null;
  links: string[];
  tags: string[];
  type: 'root' | 'idea' | 'project' | 'principle' | 'note';
  position: { x: number; y: number };
  createdAt: string;
  updatedAt: string;
}
```

## 資料層判斷

### v0
- local sample JSON
- 或 localStorage
- 操作邏輯先穩定

### v0.5
- Firestore persistence
- 為 Jarvis 直接操作資料預留穩定格式

### v1
- serverless proxy for Gemini
- 正式金鑰不進前端

## 部署判斷

### GitHub Pages vs Firebase Hosting
對這個專案來說，Firebase Hosting 比 GitHub Pages 更適合，因為：
- 之後比較自然接 Firestore
- 之後比較自然補 Functions / proxy
- 比較符合這個 app 會長大的方向

## 實作優先序
1. React/Vite scaffold
2. 型別與 sample data 對齊
3. store / actions
4. 最小 Canvas UI
5. CRUD
6. Firebase Hosting 部署

# Thinking Canvas

Thinking Canvas 是一個屬於 Jones 的可視化思考工作台。

它不是單純的心智圖工具，也不是只有聊天式互動的 AI app。現在這個 repo 已經進入一個更清楚的階段：

> *用 React Flow 建立一個可操作、可保存、可雲端同步、可由 Jarvis 協作處理的個人思考系統。*

## 目前做到哪裡

截至目前，這個專案已經具備一個可用而且開始穩定的 v0 基底：

- React + Vite + TypeScript 前端
- React Flow 畫布主體
- 節點新增、編輯、刪除、拖曳
- localStorage workspace persistence
- save-file v1 JSON 匯出 / 匯入
- import validation 與 local recovery
- Google Auth 登入
- owner-only 前端編輯權限
- 最小 Firestore 雲端讀寫
- 手動 `Save to Cloud` / `Load from Cloud`
- 薄層 autosave（local 即時，cloud debounce 同步）
- Gemini prototype 節點展開

現在這個版本已經不是 demo，而是一個可以真的開始使用、並且能逐步演化的工作台。

## 專案定位

Thinking Canvas 想解的不是「怎麼做一個很炫的 AI 畫布」，而是：

- 想法怎麼被看見
- 想法怎麼被結構化
- 想法怎麼被保存
- 想法怎麼被 Jones 與 Jarvis 協作操作
- 想法怎麼跨 session、跨裝置延續

這也是為什麼目前架構一直在刻意維持這幾個原則：

- *人主導，AI 增強*
- *tree-first，graph-ready*
- *資料層由 app 掌握，不被 React Flow 綁死*
- *local 與 cloud 分層，不把所有責任塞給單一 persistence*

## 目前的儲存模型

目前專案實際上有三層保存概念：

### 1. Runtime state
互動中的暫態，例如 hover、dragging、loading、focus。

### 2. Workspace persistence
目前由 browser `localStorage` 承擔。

- `thinking-canvas-document`
- `thinking-canvas-ui`

這一層的目的，是讓同一台裝置重新打開後仍保有工作現場。

### 3. Cloud persistence
目前由 Firestore 承擔最小版本。

路徑：

```text
users/{uid}/canvases/{canvasId}
```

目前雲端 document 會保存：

- `ownerUid`
- `title`
- `document`
- `presentation`
- `updatedAt`

### 4. Portable save format
匯出 / 匯入使用 save-file v1。

詳細見：`docs/save-file-spec-v1.md`

## 目前的雲端行為

### Auth 與編輯權限
目前採用 Google Auth，並且先做 owner-only 前端編輯保護。

- 未登入：read-only
- 已登入但非 owner：read-only
- owner：可編輯

這一層是 UI / frontend gating。
真正資料層保護由 Firestore rules 處理。

### Save / Load
目前已有：

- `Save to Cloud`
- `Load from Cloud`

第一次寫入 Firestore 時，需要先手動按一次 `Save to Cloud`。
之後如果 Firestore 已有資料，就可以透過 `Load from Cloud` 載回。

### Autosave
目前 autosave 採用刻意保守的設計：

- `localStorage` 仍然是即時保存
- Firestore autosave 只在內容真正變動後排程
- debounce 1500ms
- 只對 owner + 已登入啟用
- 保留手動 `Save to Cloud` 按鈕作為 fallback
- `Load from Cloud` 成功後會 suppress 下一次 autosave，避免剛 load 完又立刻 save 回去

Sidebar 目前會顯示簡單 autosave 狀態：

- `Cloud autosave idle`
- `Unsaved cloud changes`
- `Saving...`
- `Saved`
- `Autosave failed`

## 為什麼目前這樣做

這一版不是要追求最完整，而是追求：

> *穩、薄、不引入新 loop。*

我們剛經歷過 React Flow / Zustand / Firebase 同步相關的 render loop 問題，所以這一版很刻意地避免：

- 每個 state 變化都立刻打 Firestore
- 把 autosave 做成新的 effect 災難
- 過早加入多人協作抽象
- 過早加入 version history
- 過早拔掉手動 save

## 資料模型現況

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

### ThoughtNode

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

### CanvasDocument

```ts
interface CanvasDocument {
  canvas: Canvas
  nodes: Record<string, ThoughtNode>
}
```

### Presentation
目前由下列欄位組成：

- `flowDirection`
- `nodeShape`
- `nodeSize`
- `nodeTextScale`

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 啟動開發環境

```bash
npm run dev
```

### 3. 建立 `.env.local`

```bash
cp .env.example .env.local
```

範例：

```bash
VITE_FIREBASE_API_KEY=你的_firebase_web_api_key
VITE_GEMINI_MODEL=gemini-2.5-flash
# Optional: local Functions emulator only
# VITE_USE_FUNCTIONS_EMULATOR=true
```

如果要讓 Jarvis 在本機呼叫 thinking-canvas 專屬寫入 function，可在 *本機自己的* `.env.local` 放：

```bash
TC_OWNER_UID=Jones_的_Firebase_Auth_UID
TC_CANVAS_ID=main
TC_JARVIS_SHARED_SECRET=你設定在 Firebase Functions secret 的共享密鑰
```

注意：
- 這些值只應放在 Jarvis Mac mini 本機的 `.env.local`
- 不要 commit 真實 secret
- repo 的 `.env.example` 只保留欄位名稱與示意值

## Firebase 設定

目前 Firebase client config 已改成走 Vite env：

- `VITE_FIREBASE_API_KEY`

這不是為了把 web api key 當成秘密，而是為了：

- 避免 key 再被硬寫進 repo
- 降低 GitHub secret scanning 警報
- 讓本地與部署設定更乾淨

### Firestore rules
目前建議的最小規則是：

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/canvases/{canvasId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId;
    }
  }
}
```

目前新的方向是：
- 保留前端 owner flow（Google Auth + owner-only UI）
- Jarvis 寫入不再走 Email/Password Firebase Auth
- 改為呼叫 `jarvisUpdateNode` callable function，由 backend 用 Admin SDK 寫入 Firestore

這代表 Firestore rules 不需要再為 Jarvis 額外開 Email/Password bot 帳號白名單。
真正的 Jarvis 寫入授權邊界，改到 function 層處理。

## Gemini / AI proxy

目前 AI 子節點建議已改成經過 Firebase Functions server-side proxy，這條線已完成可用版本驗證。

架構：

- Frontend 呼叫 callable function `generateNodeIdeas`
- Function 端使用 `GEMINI_API_KEY` secret 呼叫 Gemini
- 前端不再持有 Gemini API key
- 2nd gen function 底層需要允許瀏覽器 invoke，真正的 owner-only / auth gate 留在 app / function 邏輯層

### 本地開發前置

1. 安裝前端依賴
2. 安裝 functions 依賴
3. 設定 Firebase secret
4. 確認對應的 2nd gen Cloud Run service 允許 unauthenticated invoke

```bash
npm install
cd functions && npm install && cd ..
npx firebase-tools functions:secrets:set GEMINI_API_KEY
npx firebase-tools deploy --only functions --project thinking-canvas
```

### 這次實作踩到的關鍵點

- Firebase Functions 2nd gen 底層是 Cloud Run
- deploy 成功不代表瀏覽器一定能呼叫成功
- 如果 logs 出現 `The request was not authenticated`，根因通常不是 Gemini，也不一定是真正的 CORS 問題，而是 Cloud Run invoker 權限尚未放行
- 這次最終解法是：允許底層 service 被瀏覽器呼叫，再把真正的產品權限控制維持在 app / function 邏輯層

之後可用 emulator 或直接 deploy functions。

另外，若你看到：

```text
503 Service Unavailable
```

這通常是 Google 端暫時不可用，不一定是 app 本身壞掉。

## Repo scripts for Jarvis Firebase access

目前新的策略是：
- *讀取 / 查詢*：之後補 dedicated backend read/query function
- *寫入 / 更新*：走 `jarvisUpdateNode` callable function

### 更新單一 node

```bash
node scripts/update-node.mjs \
  --node <nodeId> \
  --title "新的標題" \
  --content "新的內容"
```

也可只改其中一個欄位：

```bash
node scripts/update-node.mjs --node <nodeId> --content "只更新內容"
```

這支腳本現在會：
- 讀取本機 `.env.local` 的 `TC_OWNER_UID` / `TC_CANVAS_ID` / `TC_JARVIS_SHARED_SECRET`
- 呼叫 `jarvisUpdateNode` callable function
- 由 function 端使用 Admin SDK 寫 Firestore
- 同步更新 node 與 canvas 的 `updatedAt`

### 讀取腳本現況

`scripts/inspect-canvas.mjs` 將不再使用 Email/Password Firebase Auth。
目前先退役成提示腳本，提醒後續應改補 dedicated read/query function，而不是繼續走 direct Firebase Auth login。

### 為什麼不是用 firebase-tools

因為這條工作流的核心不是 Firebase CLI，而是：
- Node script
- callable function
- backend Admin SDK
- project-scoped secret

`firebase-tools` 主要負責 deploy / secret 設定 / console-oriented CLI 操作；
真正的 Jarvis 寫入，是透過 function 鏈路完成。

## 專案結構

```text
thinking-canvas/
├── README.md
├── docs/
│   ├── architecture-notes.md
│   ├── handoff-guide.md
│   ├── product-direction.md
│   ├── roadmap.md
│   ├── save-file-spec-v1.md
│   └── storage-architecture.md
├── src/
│   ├── components/
│   ├── data/
│   ├── lib/
│   └── types/
```

## 建議閱讀順序

如果你是 Jones、Jarvis，或下一位中途接手的 agent，建議先讀：

1. `README.md`
2. `docs/roadmap.md`
3. `docs/storage-architecture.md`
4. `docs/architecture-notes.md`
5. `docs/handoff-guide.md`
6. `docs/save-file-spec-v1.md`

## 下一步最值得做的事

目前這個 checkpoint 完成後，最合理的下一批工作是：

1. 強化 autosave UX
   - 更清楚的 save status
   - 更平滑的 saved 時間提示

2. Firestore rules 補強
   - 欄位型別檢查
   - 防空 document / 空 nodes

3. Cloud document metadata 再整理
   - 是否補 `createdAt`
   - 未來 canvas list 所需欄位

4. Gemini 體驗優化
   - 加 retry / fallback / backoff
   - 補更清楚的 loading / error UX

5. Firebase Hosting 正式部署
   - 補 production env
   - 收斂 deploy 流程

6. 未來可能的 canvas list / multiple documents
   - 不再只固定 `main`

## 收尾原則

這個 repo 有一個非常重要的工作規則：

> *只要完成一個可保存、可交付、可追蹤的 checkpoint，就 commit + push。*

因為 Jones 常直接從遠端或手機看結果，不 push 等於看不到。

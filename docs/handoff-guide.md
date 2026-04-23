# Handoff Guide

## 這份文件的目的

這份文件是給未來中途接手的 agent 用的。
如果你剛進到這個 repo，不要先自由發揮，先照這份理解，再開始做。

## 專案一句話

Thinking Canvas 是一個給 Jones 使用的可視化思考工作台，現在已經從本地 prototype 進入「本地 + 雲端 + autosave + Jarvis 可受控寫入」的早期實用階段。

## 當前最重要目標

現在最重要的目標已經不是「接上 Firebase」本身，因為最小 Firebase / Firestore persistence 已經完成，而且 Jarvis 的最小寫入鏈路也已打通。

下一位接手 agent 的主要目標應該是：

- 穩住目前已打通的 Jarvis write path
- 補文件與操作邊界，避免擴充失控
- 完成 Firebase Hosting / production 收尾
- 再往 trip-planner 的同模式複製前進

## 現在的明確限制

目前先不要急著做：

- Python backend
- 重型 graph engine
- 複雜多人協作
- node subcollection
- version history
- repository pattern 大重構
- 過度 UI polish
- 把 read/query 也急著全部上雲端 function
- 把 thinking-canvas 長成很多細碎 function

## 推薦工作順序

1. 先確認目前 app 行為穩不穩
2. 先讀 README、roadmap、storage architecture、architecture notes
3. 若要碰 autosave，優先避免引入新 loop
4. 若要碰 Firestore，先確認 rules 與 metadata，而不是先拆 schema
5. 最後才補更細的 UX polish

## 你應該優先檢查哪些檔案

- `README.md`
- `docs/roadmap.md`
- `docs/storage-architecture.md`
- `docs/architecture-notes.md`
- `src/lib/store.ts`
- `src/lib/cloud.ts`
- `src/App.tsx`
- `src/components/FlowCanvas.tsx`

## 做事原則

### 1. 不要把 runtime state、local persistence、cloud persistence 混成一層
這是目前最重要的架構原則之一。

### 2. 不要把 autosave 做成新的 effect 災難
這個 repo 已經踩過 auth loop 與 flow sync loop，下一位 agent 不應再重演。

### 3. 每做完一個可保存里程碑就 commit + push
這對 Jones 很重要，因為他常從手機看結果。

### 4. 文件要跟上
如果方向、結構、里程碑改了，就更新文件，不要讓 repo 文件停在過期狀態。

### 5. 記得這是單人專案
不要自動帶入多人 SaaS 的假設。除非 Jones 明確要求，不需要為 migration framework、role system、複雜協作做過度設計。

## 2026-04-23 checkpoint：Jarvis write path 已正式打通

這次最重要的成果不是多一個小腳本，而是 *thinking-canvas 的 Jarvis 寫入架構已換軌成功*。

### 已完成的事情

- 保留原本前端 owner flow
  - Jones 繼續用 Google Auth + 前端 owner-only 模式操作
- 移除 Jarvis 對 Firebase Auth Email/Password 的依賴
  - 這條線已正式退役
- 改為少量 privileged write functions
  - `jarvisUpdateNode`
  - `jarvisCreateChildNode`
- Jarvis 本地只透過 repo script 呼叫 callable function
- function 端用 Admin SDK 寫 Firestore
- 每次 Jarvis 寫入都會補最小 actor metadata
  - `updatedByType`
  - `updatedByLabel`
  - `updatedBySource`
  - `updatedByOwnerUid`
  - `updatedByAt`

### 已實測成功的能力

- 更新 root node 標題成功
- 新增 child node 成功
- function response 已可回傳 actor metadata

### Jarvis 操作入口已外移到 ops repo

現在的推薦入口不再是直接從 `thinking-canvas/scripts/` 開始。

Jarvis 新 session 應優先從：

```text
~/Downloads/code/jarvis-firebase-ops/projects/thinking-canvas/
```

開始，因為那裡才是：
- wrapper scripts
- project-scoped env
- CRUD 操作入口
- 未來跨 session 最容易延續的地方

### `thinking-canvas` repo 現在主要保留

- app 本身
- deployed callable functions
- app / Firebase 架構文件

### 相關本機 env

Jarvis 真正要用的 env，現在應優先放在 ops repo 的：

```text
projects/thinking-canvas/.env.local
```

至少包含：

```bash
TC_FIREBASE_API_KEY=...
TC_OWNER_UID=...
TC_CANVAS_ID=main
TC_JARVIS_SHARED_SECRET=...
```

注意：
- 這些值只應存在 Jarvis Mac mini 本機 `.env.local`
- 不進 git
- `firebase-tools` 不是這條資料讀寫鏈路的核心；真正的新鏈路是 ops repo wrapper + callable function + Admin SDK

## 目前最理想的下一批輸出

如果下一位 agent 要繼續，最有價值的是：

- 把這次 checkpoint 文件保持同步
- 不要急著再長更多 cloud functions
- 先把這條模式整理成可複製模板
- 然後把 *同樣思路* 套到 `trip-planner`
- Firebase Hosting / production 收尾可後續進行

## 完成後的收尾

每完成一個可保存階段後：

1. 更新 docs
2. `npm run build`
3. `git status` 檢查
4. commit
5. push

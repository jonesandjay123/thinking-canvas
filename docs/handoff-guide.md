# Handoff Guide

## 這份文件的目的

這份文件是給未來中途接手的 agent 用的。
如果你剛進到這個 repo，不要先自由發揮，先照這份理解，再開始做。

## 專案一句話

Thinking Canvas 是一個給 Jones 使用的可視化思考工作台，現在已經從本地 prototype 進入「本地 + 雲端 + autosave」的早期實用階段。

## 當前最重要目標

現在最重要的目標已經不是「接上 Firebase」本身，因為最小 Firebase / Firestore persistence 已經完成。

下一位接手 agent 的主要目標應該是：

- 穩住 autosave 體驗
- 補 Firestore rules 與 metadata
- 規劃下一步 multiple canvas / Gemini 正式化

## 現在的明確限制

目前先不要急著做：

- Python backend
- 重型 graph engine
- 複雜多人協作
- node subcollection
- version history
- repository pattern 大重構
- 過度 UI polish

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

## 目前最理想的下一批輸出

如果你現在要直接開始做，最有價值的是：

- autosave UX 小幅優化
- Firestore rules 補強草案
- cloud metadata 補強
- README / docs 與新 checkpoint 保持同步
- Gemini Cloud Functions 路線落地與驗證

## 完成後的收尾

每完成一個可保存階段後：

1. 更新 docs
2. `npm run build`
3. `git status` 檢查
4. commit
5. push

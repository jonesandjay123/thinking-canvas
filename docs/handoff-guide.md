# Handoff Guide

## 這份文件的目的
這份文件是給未來中途接手的 agent 用的。

如果你剛進到這個 repo，不要先自由發揮。先照這份理解，再開始做。

## 專案一句話
Thinking Canvas 是一個給 Jones 使用的可視化思考工作台，正在從互動畫布逐步長成可保存、可搬移、可累積的思考系統。

## 當前最重要目標

目前最重要的不是一次把所有雲端功能做完，而是：

*先把本地 persistence、storage architecture、save-format thinking 這一段收斂完整。*

## 現在的明確限制

目前先不要急著做：
- Python backend
- 重型 graph engine
- 複雜多人協作
- 太早綁死 Firestore schema
- 過度 UI polish

## 推薦工作順序

1. 先確認目前本地 app 行為穩不穩
2. 再確認 localStorage 與文件是否同步
3. 再確認 save-file spec 的概念邊界是否清楚
4. 然後才做最小 export/import
5. 最後才談 Firebase / Firestore 映射

## 你應該優先檢查哪些檔案

- `README.md`
- `docs/roadmap.md`
- `docs/storage-architecture.md`
- `docs/architecture-notes.md`
- `src/lib/store.ts`
- `src/types/canvas.ts`
- `src/components/FlowCanvas.tsx`

## 做事原則

### 1. 不要把 runtime state、local persistence、save file 混在一起
這是目前最重要的架構原則之一。

### 2. 不要把資料邏輯塞進畫面元件
資料、操作、UI 仍然要分清楚。

### 3. 每做完一個可保存里程碑就 commit + push
這對 Jones 很重要，因為他常從手機看結果。

### 4. 文件要跟上
如果方向、結構、里程碑改了，就更新文件，不要讓 repo 文件停在過期狀態。

## 目前最理想的下一批輸出

如果你現在要直接開始做，最有價值的是：
- 文件化 save-file v1 草案
- 最小 export/import 設計
- import validation thinking
- localStorage migration thinking

## 完成後的收尾

每完成一個可保存階段後：
1. 更新 docs
2. git status 檢查
3. commit
4. push

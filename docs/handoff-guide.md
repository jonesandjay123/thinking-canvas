# Handoff Guide

## 這份文件的目的
這份文件是給未來中途接手的 agent 用的。

如果你剛進到這個 repo，不要先自由發揮。先照這份理解，再開始做。

## 專案一句話
Thinking Canvas 是一個給 Jones 使用的可視化思考工作台。

它的核心不是炫技 AI，而是：
- 結構化思考
- 可視化操作
- Jarvis 可直接協作修改
- 長期可累積

## 當前最重要目標

*明天上 Firebase，並且有一個可以玩的初版。*

如果你的工作不直接幫助這件事，優先級通常就不夠高。

## 現在的明確限制

目前先不要做：
- Python backend
- 完整 graph 系統
- 複雜 AI 功能
- 很重的 UI polish

## 推薦工作順序

1. 先確認 app scaffold 有沒有起來
2. 再確認 schema 是否正式化
3. 再確認 store / actions 是否存在
4. 再確認 UI 是否可以 CRUD
5. 最後才處理部署與額外強化

## 你應該優先檢查哪些檔案

- `README.md`
- `docs/roadmap.md`
- `docs/architecture-notes.md`
- `src/data/sample-canvas.json`
- `src/types/`
- `src/lib/`
- `src/components/`

## 做事原則

### 1. 不要過度設計
現在要的是可玩的初版，不是五年架構藍圖。

### 2. 不要把資料邏輯塞進畫面元件
資料、操作、UI 要分清楚。

### 3. 每做完一個可保存里程碑就 commit + push
這對 Jones 很重要，因為他常從手機看結果。

### 4. 文件要跟上
如果你改了方向、結構、任務順序，就更新文件。
不要讓 repo 狀態和文件脫節。

## 目前最理想的下一批輸出

如果你現在要直接開始做，最有價值的是：
- Vite app scaffold
- TS schema
- store/actions
- 最小 CanvasView
- 最小 NodeCard
- sample data render
- build 成功

## 完成後的收尾

每完成一個可保存階段後：
1. 更新 docs
2. git status 檢查
3. commit
4. push

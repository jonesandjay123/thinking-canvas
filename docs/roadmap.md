# Roadmap

> 這份文件是給 Jones、Jarvis、以及任何中途接手的 agent 用的。
> 原則是：不要重新猜方向，直接照著做。

## 北極星目標

Thinking Canvas 要從「可互動的畫布」穩定長成「可保存、可搬移、可累積」的思考系統。

## 當前階段定位

目前已完成一個可操作的本地版本基底，包含：
- React + Vite + TypeScript app
- React Flow 畫布
- 節點 CRUD
- 本地 localStorage persistence
- 基本 UI 控制面板
- 基本 Gemini prototype 展開

現在的下一個合理里程碑，不是一次把所有雲端功能做到底，而是：

> 先把本地 storage / save-format 這個段落收斂完成，再往 export/import 與 Firebase 前進。

## 現在不要做的事

在本地 storage 段落收斂前，不要分心去做：
- Python backend
- 複雜 graph engine
- 過度設計的多人協作
- 太早綁死 Firestore schema
- 重型 UI polish

## Phase 1, 本地工作段落（現在）

### 1.1 穩定本地 persistence
- [x] localStorage 保存 document
- [x] localStorage 保存主要 UI 設定
- [ ] 明確定義 localStorage migration 策略
- [ ] 補最小 reset / recovery thinking

### 1.2 定 storage architecture
- [x] 文件化 runtime / workspace persistence / portable save format 三層模型
- [x] 文件化 document / presentation / user preference 概念邊界
- [x] 決定 save-file v1 的正式欄位清單
- [x] 決定 import validation 最小規則

### 1.3 文件同步
- [x] README 更新為目前真實狀態
- [x] roadmap 更新為本地段落優先
- [x] 補 storage architecture 文件
- [ ] handoff guide 同步更新為新階段語氣

## Phase 2, 本地存檔能力

### 2.1 最小 export/import
- [ ] 匯出 versioned JSON file
- [ ] 匯入 versioned JSON file
- [ ] 對 schema 不符做提示
- [ ] 對 version 不符做提示或 migration

### 2.2 Save file spec v1
- [x] 定義 `app`
- [x] 定義 `version`
- [x] 定義 `exportedAt`
- [x] 定義 `document`
- [x] 定義 `presentation`
- [x] 決定是否暫不納入 `userPreference`

## Phase 3, 雲端 persistence

### 3.1 Firebase / Firestore 對接
- [ ] 決定 Firestore document 切法
- [ ] 決定 document 與 presentation 的雲端邊界
- [ ] 補最小讀寫
- [ ] 補最小安全規則

### 3.2 Agent-friendly 操作面
- [ ] 明確整理可操作 action
- [ ] 規劃 Jarvis 未來透過 SDK 或 API 修改資料的方式

## 每次接手前必讀

任何 agent 接手前，請先讀：
1. `README.md`
2. `docs/roadmap.md`
3. `docs/storage-architecture.md`
4. `docs/handoff-guide.md`
5. `docs/architecture-notes.md`

## 每完成一個階段後必做

- [ ] 更新文件
- [ ] commit
- [ ] push

不要把進度只留在對話裡。

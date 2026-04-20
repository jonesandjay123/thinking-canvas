# Roadmap

> 這份文件是給 Jones、Jarvis，以及任何中途接手的 agent 用的。
> 原則是：不要重新猜方向，直接接著做。

## 北極星目標

Thinking Canvas 要從「可互動的畫布」穩定長成「可保存、可搬移、可累積、可由 agent 協作操作」的思考系統。

## 當前階段定位

目前已經完成一個比最初 prototype 穩很多的 checkpoint，包含：

- React + Vite + TypeScript app
- React Flow 畫布
- 節點 CRUD
- localStorage workspace persistence
- save-file v1 JSON 匯出 / 匯入
- import validation 與 local recovery
- Google Auth
- owner-only 前端 gating
- 最小 Firestore 雲端 persistence
- 手動 Save / Load to Cloud
- debounce autosave（local 即時，cloud 延遲同步）
- 基本 autosave status UI

這表示現在專案已經正式跨過「只有本地 prototype」那條線。

## 現在不要做的事

在當前穩定階段，不要分心去做：

- Python backend
- 複雜多人協作
- node subcollection 拆分
- version history
- 重型 repository pattern
- 大規模 UI polish
- beforeunload 強制雲端保存

## Phase 1，本地工作段落（已完成）

### 1.1 穩定本地 persistence
- [x] localStorage 保存 document
- [x] localStorage 保存主要 UI 設定
- [x] normalize + invalid fallback
- [x] 最小 reset / recovery

### 1.2 定 storage architecture
- [x] 文件化 runtime / workspace persistence / portable save format
- [x] 文件化 document / presentation 邊界
- [x] 定義 save-file v1
- [x] 建立 import validation 最小規則

### 1.3 文件同步
- [x] README 同步更新
- [x] roadmap 同步更新
- [x] storage architecture 同步更新
- [x] handoff 文件同步更新

## Phase 2，本地存檔能力（已完成）

### 2.1 最小 export/import
- [x] 匯出 versioned JSON file
- [x] 匯入 versioned JSON file
- [x] schema 不符提示
- [x] version 不符提示

### 2.2 Save file spec v1
- [x] 定義 `app`
- [x] 定義 `version`
- [x] 定義 `exportedAt`
- [x] 定義 `document`
- [x] 定義 `presentation`

## Phase 3，最小雲端 persistence（已完成第一版）

### 3.1 Firebase / Firestore 對接
- [x] 決定 Firestore document 切法
- [x] 以 `users/{uid}/canvases/{canvasId}` 作為最小路徑
- [x] 實作最小讀寫
- [x] 保留 localStorage fallback
- [x] 修正首次空雲端 / fallback 問題
- [x] 修正 auth / React Flow feedback loop

### 3.2 權限與使用模式
- [x] Google Auth
- [x] owner-only 前端編輯 gating
- [x] 基本 Firestore rules 已由 Jones 於 Console 套用

## Phase 4，薄層 autosave（現在已完成第一版）

### 4.1 Autosave 行為
- [x] localStorage 保持即時保存
- [x] Firestore autosave debounce 1500ms
- [x] 僅在 owner + 已登入時啟用
- [x] 手動 Save to Cloud 仍保留
- [x] Load from Cloud 後 suppress 下一次 autosave

### 4.2 Autosave UI
- [x] `idle`
- [x] `dirty`
- [x] `saving`
- [x] `saved`
- [x] `error`

## Phase 5，下一個合理里程碑

### 5.1 Firestore rules 補強
- [ ] 限制欄位型別
- [ ] 限制空 document / 空 nodes 寫入
- [ ] 規則文件化

### 5.2 Cloud metadata 補強
- [x] `ownerUid`
- [x] `title`
- [ ] 是否補 `createdAt`
- [ ] 為未來 canvas list 準備 metadata

### 5.3 Autosave UX polish
- [ ] 更清楚的 save status 文案
- [ ] 顯示最後一次雲端保存時間
- [ ] autosave error 的可回復提示

### 5.4 Gemini 正式化
- [ ] 從前端 key 遷移到 Cloud Functions
- [ ] retry / backoff
- [ ] fallback model 策略

### 5.5 多 canvas 能力
- [ ] 不再只固定 `main`
- [ ] canvas list / create new canvas
- [ ] 最小切換能力

## 每次接手前必讀

任何 agent 接手前，請先讀：

1. `README.md`
2. `docs/roadmap.md`
3. `docs/storage-architecture.md`
4. `docs/handoff-guide.md`
5. `docs/architecture-notes.md`
6. `docs/save-file-spec-v1.md`

## 每完成一個階段後必做

- [ ] 更新文件
- [ ] build 驗證
- [ ] commit
- [ ] push

不要把進度只留在對話裡。
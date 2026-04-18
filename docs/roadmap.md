# Roadmap

> 這份文件是給 Jones、Jarvis、以及任何中途接手的 agent 用的。
> 原則是：不要重新猜方向，直接照著做。

## 北極星目標

*明天上 Firebase，並且有一個可以實際打開來玩的初版 Thinking Canvas。*

## 現在不要做的事

在達成上面的目標前，不要分心去做：
- Python backend
- Gemini 正式接入
- 複雜 graph engine
- 過度設計的權限系統
- 太花時間的 UI 美化

## Phase 0, 今天晚上要完成的事

### 0.1 建 app scaffold
- [ ] 建立 `package.json`
- [ ] 安裝 React + Vite + TypeScript 基本骨架
- [ ] 建立 `src/main.tsx`
- [ ] 建立 `src/App.tsx`
- [ ] 確保 `npm run dev` 可開
- [ ] 確保 `npm run build` 可過

### 0.2 定正式 schema
- [ ] 建立 `src/types/canvas.ts`
- [ ] 定義 `Canvas`
- [ ] 定義 `ThoughtNode`
- [ ] 定義 `CanvasDocument` 或等價集合型別
- [ ] 將 `src/data/sample-canvas.json` 對齊 schema

### 0.3 建 store 與 actions
- [ ] 建立 `src/lib/store.ts`
- [ ] 建立 `src/lib/actions.ts`
- [ ] 支援 `createNode`
- [ ] 支援 `updateNode`
- [ ] 支援 `deleteNode`
- [ ] 支援 `moveNode`（最簡單版本即可）
- [ ] 支援 `attachChild` / `detachChild`（如需要）

### 0.4 做最小 UI
- [ ] 建立 `src/components/CanvasView.tsx`
- [ ] 建立 `src/components/NodeCard.tsx`
- [ ] 至少能 render root + child nodes
- [ ] 可新增節點
- [ ] 可編輯 title/content
- [ ] 可刪除節點
- [ ] 畫面不追求美，只追求可用

## Phase 1, 明天上 Firebase 前

### 1.1 清 deployment path
- [ ] 建立 Firebase 專案設定
- [ ] 加入 Hosting 配置
- [ ] 驗證 build output 可部署
- [ ] 完成第一次 Firebase Hosting deploy

### 1.2 補最基本 persistence
二選一即可，先求快：
- [ ] localStorage
- [ ] 或 Firestore（如果時間夠）

### 1.3 補最少文件
- [ ] README 保持同步
- [ ] 若架構有改，更新 `docs/architecture-notes.md`
- [ ] 若任務順序有改，更新本檔

## Phase 2, 初版可玩之後

### 2.1 Firestore 對接
- [ ] 將 canvas 讀寫接到 Firestore
- [ ] 確定資料格式適合 Jarvis 直接操作
- [ ] 設定最基本的 Firestore rules

### 2.2 Agent-friendly 操作面
- [ ] 明確整理可操作 action
- [ ] 規劃 Jarvis 未來透過 SDK 或 API 修改資料的方式

### 2.3 AI enhancement
- [ ] 補極薄 serverless proxy
- [ ] 再接 Gemini 的 node expansion

## 每次接手前必讀

任何 agent 接手前，請先讀：
1. `README.md`
2. `docs/roadmap.md`
3. `docs/handoff-guide.md`
4. `docs/architecture-notes.md`

## 每完成一個階段後必做

- [ ] 更新文件
- [ ] commit
- [ ] push

不要把進度只留在對話裡。

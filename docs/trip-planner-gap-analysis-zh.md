# Thinking Canvas 對照 Trip Planner 差距分析（2026-04-24）

這份文件是給明天繼續開發 `thinking-canvas` 時使用的執行參考。

背景：`trip-planner` 今天已經完成一條相對穩定的「Jarvis 後台可直接改 Firestore、前端即時看見、必要時可由 Jarvis 備份與還原」工作流。`thinking-canvas` 目前也已經有 Jarvis callable function 寫入能力，但整體成熟度還落後一段。

---

## 0. 兩個專案的定位差異

### Trip Planner

`trip-planner` 是為 2026 日本東京行量身打造的旅行協作工具。

核心使用場景：

- Jones 在東京街頭快速和 Jarvis 討論某天行程。
- 朋友可以一起看、一起參與規劃。
- Jarvis 可在後台直接調整 Firestore 裡的方案、小卡、日期與時段。
- 旅行結束後，短期內可能不再高頻使用，除非未來轉型成泛用旅遊規劃工具。

### Thinking Canvas

`thinking-canvas` 是 Jones 的可視化思考工作台。

核心使用場景：

- Jones 把想法視覺化、結構化。
- Jarvis 協助補節點、整理節點、改寫內容、擴張分支。
- 目前仍是 owner-only 寫入：只有 `jonesandjay123@gmail.com` 可寫，其它帳號只能讀。
- 它比 `trip-planner` 更像長期思考基礎設施，不是單趟旅程工具。

因此明天跟進時不要照抄 trip-planner 的產品形態，而是吸收它的幾個「可靠操作模式」。

---

## 1. 目前 Thinking Canvas 現況

### App repo

位置：

```text
~/Downloads/code/thinking-canvas
```

主要技術：

- React + Vite + TypeScript
- Zustand store
- `@xyflow/react` / React Flow 作為畫布
- Google Auth
- Firestore cloud persistence
- Firebase Functions
- Gemini 節點展開 prototype

### Ops repo

位置：

```text
~/Downloads/code/jarvis-firebase-ops/projects/thinking-canvas
```

目前已打通：

- `jarvisUpdateNode`
- `jarvisCreateChildNode`
- wrapper scripts：
  - `scripts/update-node.mjs`
  - `scripts/create-child-node.mjs`

### Firestore 路徑

目前 canvas 儲存在：

```text
users/{uid}/canvases/{canvasId}
```

主 canvas 預設：

```text
canvasId = main
```

注意：`thinking-canvas` 是 user-scoped；不像 `trip-planner` 固定 `trips/main`。

---

## 2. Trip Planner 已有、Thinking Canvas 應效仿的能力

### A. Jarvis 操作入口成熟度

Trip Planner 現況：

- `jarvis-firebase-ops/projects/trip-planner/OPERATIONS.md` 已是完整操作手冊。
- wrapper scripts 覆蓋 inspect / add / update / delete / move / clone / reset / rename / backup / restore。
- 新 session 只要讀 ops doc，就能直接操作。

Thinking Canvas 現況：

- 只有 update node / create child node。
- 缺少 inspect canvas / inspect node / backup / restore / list backup。
- 缺少完整「明天要怎麼維運」的操作序列。

建議補上：

1. `inspect-canvas.mjs`
   - 印 canvas title、nodeCount、rootNodeId、updatedAt、最近 actor metadata。
2. `inspect-node.mjs --node <id>`
   - 印 node title/content/type/parent/children/path。
3. `backup-canvas.mjs --label <label> --reason <reason>`
   - 由 callable function 在 Firestore 建立 backup document。
4. `list-backups.mjs`
5. `inspect-backup.mjs`
6. `restore-canvas-backup.mjs --backup <id> --dry-run`
7. `restore-canvas-backup.mjs --backup <id>`

---

### B. Firestore 後台備份 / 還原

Trip Planner 現況：

- 已有 Jarvis-only 備份：`trips/backup_*`。
- restore 前會先自動建立 safety backup。
- 不做前端 UI，不讓使用者誤觸。
- 這很適合 AI agent 操作資料時當安全繩。

Thinking Canvas 現況：

- 目前沒有等價的 DB backup function。
- 只有 JSON export/import 是前端功能，且更偏 portable save file，不是 Jarvis 後台 safety backup。

建議補上：

Firestore backup document 可放在同一個 user 底下：

```text
users/{ownerUid}/canvasBackups/{backupId}
```

或放在 canvas 子集合：

```text
users/{ownerUid}/canvases/{canvasId}/backups/{backupId}
```

我建議第二種，語意更接近「這張 canvas 的備份」：

```text
users/{ownerUid}/canvases/main/backups/backup_YYYYMMDD-HHMMSS_label
```

backup payload 建議：

```ts
{
  id: string
  label: string
  reason: string
  createdAt: serverTimestamp
  createdBy: 'jarvis'
  ownerUid: string
  canvasId: string
  title: string
  nodeCount: number
  canvasRecord: {
    ownerUid: string
    title: string
    document: CanvasDocument
    presentation: CloudPresentation
    updatedAt: unknown
  }
}
```

Restore 原則：

- restore 前自動備份目前 live 狀態。
- `--dry-run` 只印 summary，不覆蓋。
- 真 restore 才覆蓋 `users/{ownerUid}/canvases/{canvasId}` 的 `document` / `presentation`。
- 不需要做前端按鈕；先留給 Jarvis 操作即可。

---

### C. 後台寫入後前端即時刷新

Trip Planner 今天的關鍵教訓：

- 舊前端曾從 stale `localStorage` 啟動。
- refresh/pagehide 時用整份 local state 反蓋 Firestore。
- 導致 Jarvis 後台 callable 寫入被舊 tab 覆蓋。
- 已在 `trip-planner` commit `20a3bfc fix: prevent stale local cache overwrites` 修正。

Thinking Canvas 現況：

- `src/lib/cloud.ts` 目前使用 `getDoc` + `setDoc`。
- `src/App.tsx` 登入 owner 後會自動 `loadFromCloud` 一次。
- localStorage 仍會先啟動 app：`thinking-canvas-document` / `thinking-canvas-ui`。
- 目前沒有 `onSnapshot` realtime listener。
- Jarvis 後台 `jarvisUpdateNode` / `jarvisCreateChildNode` 寫入後，前端不一定即時更新；可能要手動 Load from Cloud 或 reload。

建議補上：

1. 新增 `subscribeToCloudCanvas({ uid, canvasId }, callback)`。
   - 用 Firestore `onSnapshot` 訂閱 `users/{uid}/canvases/{canvasId}`。
2. 前端 owner/viewer 都可訂閱。
   - viewer 只能看，但應該能即時看到 Jones/Jarvis 更新。
3. 對 localStorage 寫回加 dirty guard。
   - 不要把 remote snapshot 載入視為 dirty。
   - 只有本機真正的 edit / drag / import / UI change 才 autosave。
4. 避免 remote snapshot 觸發 autosave echo。
   - 需要 `suppressNextAutosaveRef` 或更明確的 `dirtySource`。
5. 加版本或修訂欄位。
   - 可先在 document record 上加 `revision` 或 `updatedBySource`。
   - 前端看到 newer remote 時採用 remote。

這是明天優先級最高的可靠性工作，因為 Jones 未來會期待「Jarvis 後台一改，前端馬上看到」。

---

### D. 手機響應式 / 街頭使用體驗

Trip Planner 已完成：

- 手機單日 paging。
- bottom nav / slide-up panel。
- compact header。
- 觸控滾動與拖曳衝突修正。

Thinking Canvas 現況：

- CSS 只有基本 `@media (max-width: 960px)` 把 sidebar / canvas 改成單欄。
- `body { overflow: hidden; }`，手機上很容易卡住。
- sidebar 仍然佔據大量垂直空間。
- React Flow 在手機上會遇到 pinch / pan / node edit 的操作衝突。
- 節點 hover actions 對手機不友善，因為手機沒有 hover。

建議補上：

1. 手機 layout：
   - sidebar 改成 top compact toolbar 或 bottom sheet。
   - canvas 佔滿主畫面。
   - 常用操作只保留：登入狀態、Save/Load 狀態、搜尋/定位 root、AI 展開數量。
2. 節點操作：
   - hover actions 改成 tap 選中後顯示 radial/toolbar。
   - double click edit 在手機上改成 tap selected node / edit button。
3. 觸控手勢：
   - 明確區分 canvas pan、node drag、details textarea scroll。
   - details panel 需要 `nodrag nopan` 並允許內部 scroll。
4. Mobile read-only mode：
   - 朋友手機打開時應可穩定閱讀，不需要登入。
   - viewer 可看到 realtime updates。
5. Mobile owner mode：
   - Jones 手機上至少可快速新增 child、編輯 title、請 Jarvis/Gemini 展開。

---

### E. 權限模型

Trip Planner：

- 目前是多人旅行協作工具。
- 前端權限是「未登入可看、已登入可寫」的方向。
- Jarvis 透過 shared secret callable functions 寫入。

Thinking Canvas：

- owner-only 寫入：只有 `jonesandjay123@gmail.com` 可以寫。
- 其他帳號只能讀。
- Jarvis 寫入仍透過 shared secret callable functions + ownerUid/canvasId。

明天要保留這個差異：

- 不要把 thinking-canvas 改成 trip-planner 那種多人可寫。
- 朋友/外部帳號最多 viewer。
- Jarvis 是後台協作 actor，不是普通 Firebase Auth user。

建議補強：

1. Repo 內應加入/更新 Firestore rules 文件或部署規則。
2. 前端 owner 判斷目前用 email 常量：`jonesandjay123@gmail.com`。
   - 可接受，但長期可改成 env / allowlist。
3. callable function 需要保留 shared secret。
4. 每次 Jarvis 寫入都保留 actor metadata。

---

## 3. Thinking Canvas 目前最明顯的架構缺口

### 缺口 1：沒有 inspect/read wrapper

現在 Jarvis 可以寫 node，但新 session 要理解 canvas 狀態仍然不方便。

最小補法：新增 callable `jarvisInspectCanvas` / `jarvisInspectNode`，或先用 Firestore REST read script。

### 缺口 2：沒有 backup/restore

這是明天最應該從 trip-planner 複製的能力。

Thinking Canvas 的資料也是整包 document 存一筆，一旦錯寫會覆蓋整張圖；Jarvis 操作前需要安全繩。

### 缺口 3：沒有 realtime subscription

Jarvis 後台改了，前端不會保證即時刷新。

應從 `getDoc/loadFromCloud` 升級成 `onSnapshot` 訂閱，同時加 dirty guard，避免重演 trip-planner stale localStorage 事故。

### 缺口 4：手機 UI 還不是實戰可用

現在只是 responsive 起點，不是「在路上或沙發上真的好用」。

### 缺口 5：React Flow layout 太簡陋

目前 `layoutDocument()` 只是按 depth + index 排，會產生：

- sibling spacing 粗糙
- 子樹互相重疊
- 大節點/不同形狀尺寸沒有被真實納入 layout
- 手動拖曳與自動 layout 的關係不清楚

這是 Jones 說「節點分佈好醜」的主要根因之一。

---

## 4. 明天建議開發順序

### Phase 1：可靠性先補

1. 新增 inspect scripts。
2. 新增 backup / list / inspect / restore scripts。
3. 新增 backup / restore callable functions。
4. 寫入前後都能快速驗證。

完成標準：Jarvis 可以像操作 trip-planner 一樣安全操作 thinking-canvas。

### Phase 2：Realtime sync

1. `cloud.ts` 加 `onSnapshot` subscribe。
2. App 啟動後 owner/viewer 都訂閱 cloud canvas。
3. localStorage 只做 cache，不反客為主。
4. 本機 dirty guard 防止 stale cache 覆蓋遠端。

完成標準：Jarvis 後台 create/update node 後，前端不用手動 reload 就能看到。

### Phase 3：Mobile shell

1. 手機 sidebar 收斂。
2. hover actions 改 tap-friendly。
3. canvas/textarea/drag gesture 衝突處理。
4. viewer mode 手機閱讀優先。

完成標準：手機可以穩定看 canvas、選 node、讀內容、基本互動。

### Phase 4：Layout / framework 決策

先不要立刻大遷移。建議先做兩條 prototype：

1. React Flow + 更好的 tree/layout engine。
2. tldraw / infinite canvas 方向的替代 prototype。

用真實 thinking-canvas sample data 比較。

---

## 5. 我對明天的建議結論

短期不要先換掉 React Flow。

更好的明天策略：

1. 先把 `thinking-canvas` 的 Jarvis backend 操作能力補到 trip-planner 等級。
2. 先修 realtime/localStorage/cloud sync 可靠性。
3. 同時做一份「替代 canvas framework spike」，不要直接重寫主 app。
4. 若 spike 證明 tldraw 或其它框架更適合，再決定 v1 是否遷移。

原因：現在最大的風險不是 React Flow 本身，而是資料同步、安全備份、手機交互與 layout policy 還不成熟。先把這些補起來，框架選型才有可靠比較基準。

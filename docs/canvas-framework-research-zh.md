# Thinking Canvas 畫布框架 / Library 轉型研究（2026-04-24）

這份文件回應 Jones 的問題：

> 目前 React Flow 的節點分佈很醜，即使用 ELK 之類的演算法可能還是不滿意。我們是否應該考慮其它更適合的框架或 library？

結論先講：

> 不建議明天直接把主 app 從 React Flow 換掉。建議先保留 React Flow，補上資料同步與 Jarvis 後台能力；同時開一個小型 spike，比較「React Flow + 更好的 layout」與「tldraw / infinite canvas」兩條路。

---

## 1. 先定義 Thinking Canvas 真正需要什麼

Thinking Canvas 不是一般流程圖工具，也不是純白板。

它需要同時滿足：

1. Tree-first 思考結構
   - root / parent / child 關係清楚。
   - Jarvis 可以用資料結構理解與操作。
2. Graph-ready
   - 未來可能有 cross-links、tags、references。
3. Infinite canvas / visual thinking
   - 不只是排流程圖，也要有空間感、聚落感、可自由整理。
4. Agent-friendly data model
   - Jarvis 要能 inspect、create、update、backup、restore。
   - 資料不能完全被視覺框架綁死。
5. Mobile / viewer friendly
   - Jones 和朋友可以在手機上看。
   - owner 可以做簡單編輯。
6. Realtime cloud sync
   - Jarvis 後台改 Firestore，前端應即時看到。

所以選型不能只問「哪個 layout 漂亮」，而要問：

- 它是否讓資料結構仍由我們掌握？
- 它是否適合 Jarvis 後台操作？
- 它是否能處理手機互動？
- 它是否支援自由畫布，而不是只支援流程圖？

---

## 2. 目前 React Flow 的問題，不全是 React Flow 的錯

目前 `FlowCanvas.tsx` 的 layout 是自製簡單演算法：

- 按 depth 分層。
- 每層按 index 等距排。
- TB/BT/LR/RL 只改軸向。
- 不知道每個子樹實際寬度。
- 不知道 node 真實尺寸。
- 不處理 subtree collision。
- 不保留手動 layout intent。

這會導致：

- child 多的子樹和 sibling 子樹擠在一起。
- 不同大小/形狀的 node 視覺 spacing 不自然。
- 新增節點時位置像機械式散開。
- Jones 會覺得「節點分佈很醜」。

React Flow 本身比較像「node editor rendering / interaction layer」，不是美感 layout engine。官方 layout 文件也明確把 layouting 交給第三方，並列出 Dagre、D3-Hierarchy、D3-Force、ELK 等選項。

---

## 3. 候選方案總覽

### 方案 A：保留 React Flow + 換 layout 策略

適合程度：高，短期最務實。

React Flow 優點：

- 目前專案已經使用。
- React component nodes 很好客製。
- drag / pan / zoom / edges / controls 都有。
- 可繼續保有現有資料模型。
- Jarvis 後台操作不需要大改。

React Flow 缺點：

- 自身不解決漂亮 layout。
- 手機 touch UX 需要自己打磨。
- 若想做 Notion/Miro/tldraw 那種自由白板體驗，需要自己補很多 UI。

可搭配 layout：

#### Dagre

特性：

- client-side directed graph layout。
- 速度快、設定少。
- rendering agnostic。
- React Flow 官方文件推薦它作為簡單 tree / directed graph layout 的起點。

優點：

- 最快能試。
- 對 tree-first 很合理。
- 可當作「重新整理 layout」按鈕。

缺點：

- 美感有限。
- 複雜 subflow 有已知限制。
- 不能真正理解「思考聚落」或語意分組。

#### ELK / elkjs

特性：

- Eclipse Layout Kernel 的 JS 版本。
- 適合 node-link diagrams、有方向、ports、edge routing。
- 不是 diagram framework，只負責算位置。

優點：

- 比 Dagre 強很多。
- 支援 edge routing、port-like 設定、複雜 directed layout。
- 適合流程圖 / 系統圖。

缺點：

- 複雜、bundle 大、設定成本高。
- 即使 layout 正確，也可能仍然不像「思考畫布」那樣自然。
- 如果 Jones 想要的是空間感/聚落感，而非工整流程圖，ELK 未必解決核心痛點。

#### D3-Hierarchy / flextree 類

特性：

- 適合單 root tree。
- 可以做 tidy tree、cluster、radial tree。

優點：

- Thinking Canvas 目前 tree-first，很適合做漂亮樹。
- 比現在 depth/index layout 更自然。
- 可支援 radial / mind-map-like layout。

缺點：

- 對非 tree cross-links 支援弱。
- 若節點尺寸差異大，要找支援 variable node size 的實作。

#### D3-Force

特性：

- force-directed graph。
- 適合非層級 graph / knowledge graph。

優點：

- 有「聚落感」。
- 適合未來 cross-link / semantic graph。

缺點：

- 不穩定、不 deterministic，對長期思考文件可能很煩。
- 每次位置變動可能讓人失去空間記憶。
- 不適合當唯一主 layout。

我對方案 A 的建議：

- 先做 `layoutMode` 概念：manual / tidy-tree / radial / force-preview。
- 短期先試 Dagre 或 d3 tree，因為能快速驗證。
- 不要讓自動 layout 每次都覆蓋手動拖曳；應做成使用者/Jarvis 主動觸發。

---

### 方案 B：tldraw SDK / infinite canvas 方向

適合程度：中高，值得 spike。

tldraw 的定位：

- React infinite canvas SDK。
- 提供高效能 canvas、default shapes/tools、copy/paste、undo/redo、cross-tab sync。
- 官方主打 multiplayer collaboration、persistence、custom shapes、runtime API。

優點：

- 更像真正的白板 / infinite canvas。
- 手感可能比 React Flow 更自然。
- 預設 UI/互動成熟很多。
- 若未來想做 Miro / Whimsical / Heptabase 風格，tldraw 比 React Flow 更接近。
- 有自訂 shapes，可把 ThoughtNode 做成 custom shape。
- 有 sync / persistence / multiplayer 思路可參考。

缺點：

- 資料模型會被 tldraw shape store 影響，需要做 adapter。
- Tree parent/child semantics 不是它的核心，需要自己維護。
- Jarvis 後台操作時，要決定改的是我們的 domain model 還是 tldraw records。
- 若直接遷移，成本高。
- tldraw sync 的正式 multiplayer 可能引入 Cloudflare Durable Objects 等新後端，不一定符合目前 Firebase-first 架構。

適合的 spike：

- 建一個 prototype route 或 branch。
- 把 `CanvasDocument.nodes` 轉成 tldraw custom shapes。
- parent/child edge 可用 line/arrow shape 或我們自己的 relation records。
- 測試手機手感、選取、縮放、編輯、自由擺放。
- 不要一開始就接完整 Firestore sync；先驗證互動手感和資料 adapter。

我對方案 B 的判斷：

如果 Jones 追求的是「思考空間」而不是「流程圖」，tldraw 是最值得認真試的替代方案。

---

### 方案 C：Cytoscape.js

適合程度：中低。

Cytoscape.js 是成熟 graph visualization / analysis library。

優點：

- graph algorithms 很完整。
- layout 選擇多。
- 支援 selectors、graph querying、JSON serialization。
- 適合大型 network / knowledge graph visualization。

缺點：

- 比較像 graph visualization，不像可編輯思考白板。
- React custom interactive node 的體驗不如 React Flow 直覺。
- 若重點是 Jones 手動整理、輸入內容、手機閱讀，它未必是最佳選擇。

適合用法：

- 未來如果 thinking-canvas 長成「大型知識網路瀏覽器」，可另做 graph overview 模式。
- 不建議作為主編輯器替代 React Flow。

---

### 方案 D：Rete.js

適合程度：低。

Rete.js 是 TypeScript-first visual programming / processing-oriented node editor。

優點：

- node-based editor 成熟。
- 有 engine / processing / code generation 思路。
- 適合流程、資料處理、可執行 graph。

缺點：

- Thinking Canvas 不是 visual programming。
- 它會把產品往「節點流程編輯器」帶，而不是思考畫布。
- 如果未來做 agent workflow builder 才更適合。

不建議用在目前 thinking-canvas 主線。

---

### 方案 E：Excalidraw

適合程度：中低。

Excalidraw 是很好用的手繪白板。

優點：

- 表達自由、手感好。
- 很適合 sketch / diagram。

缺點：

- domain model 不自然對應 ThoughtNode。
- Jarvis 要結構化操作節點會比較痛苦。
- 白板元素比 tree/graph semantics 更弱。

可作為 inspiration，不建議作為 Thinking Canvas 的資料主體。

---

### 方案 F：完全自研 Canvas / WebGL / Pixi / Konva

適合程度：目前低。

優點：

- 最大自由度。
- 可完全控制互動、美感與效能。

缺點：

- 成本最高。
- 會把專案從「思考工具」變成「canvas engine 工程」。
- 現階段不符合快速補可靠性的目標。

除非未來確定 Thinking Canvas 是核心長期產品，否則不建議。

---

## 4. 推薦路線

### 短期：不要大遷移，先修 React Flow 版

明天最應該做：

1. Jarvis ops 補齊。
2. Firestore backup / restore 補齊。
3. Realtime `onSnapshot` 補齊。
4. localStorage dirty guard 補齊。
5. mobile shell 第一版補齊。

這些即使未來換框架也不浪費，因為它們屬於資料層 / 操作層。

### Layout 短期改法

新增「整理畫布」功能，而不是每次自動排：

- `手動模式`：保留使用者拖曳位置。
- `樹狀整理`：Dagre 或 d3-hierarchy。
- `放射整理`：root 在中間、child 往外散。
- `聚落預覽`：可用 d3-force，但不要自動保存，除非使用者確認。

重點：不要讓演算法隨便覆蓋 Jones 的空間記憶。

---

## 5. 建議的 Spike 計畫

### Spike 1：React Flow + Dagre/d3 tree

目標：快速驗證「只是 layout 太爛」是否能被解決。

工作：

- 保留現有 React Flow。
- 新增 layout util：輸入 `CanvasDocument`，輸出 updated positions。
- 用 sample/main canvas 測試。
- 加一個臨時按鈕：`整理畫布`。

成功標準：

- 不重疊。
- sibling/subtree spacing 明顯改善。
- Jones 覺得至少不醜。

### Spike 2：tldraw custom shape prototype

目標：驗證「我們其實需要的是白板型 infinite canvas」。

工作：

- 建 branch 或 demo route。
- 只實作 root + node shapes + edge lines。
- 把目前 `CanvasDocument` 轉成 tldraw records。
- 測 mobile pan/zoom/edit 感覺。

成功標準：

- 操作感明顯比 React Flow 更適合 thinking canvas。
- Domain model adapter 不會太醜。
- Jarvis 後台仍可對 domain model 操作，而不是被 tldraw record 綁死。

---

## 6. 我目前的技術判斷

### 如果目標是「明天把 thinking-canvas 變可靠」

選 React Flow 繼續走。

原因：

- 現有 code 可用。
- Jarvis callable function 已打通。
- 主要缺口是 sync、backup、mobile，不是 renderer。

### 如果目標是「長期變成真正的視覺思考工具」

認真試 tldraw。

原因：

- 它更接近 infinite canvas / whiteboard 的產品語言。
- 內建互動、selection、undo/redo、copy/paste、sync 思路比 React Flow 更完整。
- 對手機和自由整理可能更有潛力。

### 如果目標是「大型知識圖譜可視化」

未來另開 Cytoscape overview mode。

不要用它取代主編輯器。

---

## 7. 來源 / 參考

- React Flow 官方首頁：`https://reactflow.dev/`
  - React Flow 是可自訂的 node-based UI React component，內建 drag / zoom / pan / selection / add-remove elements。
- React Flow layouting 文件：`https://reactflow.dev/learn/layouting/layouting`
  - 官方未內建 layout solution，建議第三方：Dagre、D3-Hierarchy、D3-Force、ELK。
- Dagre wiki：`https://github.com/dagrejs/dagre/wiki`
  - client-side directed graph layout，rendering agnostic，重視速度。
- ELK / elkjs：`https://github.com/kieler/elkjs`
  - Eclipse Layout Kernel 的 JS 版本，適合 node-link diagrams；本身不負責 rendering。
- tldraw：`https://tldraw.dev/`
  - React infinite canvas SDK，提供 canvas infrastructure、default tools、custom shapes、runtime API。
- tldraw multiplayer collaboration：`https://tldraw.dev/features/composable-primitives/multiplayer-collaboration`
  - 內建 realtime collaboration、live cursors、conflict resolution、multi-tab sync / cross-device consistency 等概念。
- Cytoscape.js：`https://js.cytoscape.org/`
  - 完整 graph library，支援 JSON serialization、layouts、graph algorithms、touch gestures。
- Rete.js：`https://retejs.org/`
  - TypeScript-first visual programming / processing-oriented node editor。

---

## 8. 最後建議

明天不要一開始就陷入「換框架」大工程。

我建議的決策句是：

> `thinking-canvas` 主線先補成 trip-planner 等級的可靠後台操作與 realtime sync；layout 先在 React Flow 內改善；同時做 tldraw spike。若 tldraw spike 明顯勝出，再規劃 v1 遷移。

這樣不會浪費明天的開發時間，也不會錯過更適合的長期方向。

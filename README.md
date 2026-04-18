# Thinking Canvas

一個屬於 Jones 的可視化思考工作台。

Thinking Canvas 是一個以 repo 為基礎、可由 agent 協作操作的想法空間。它會先從類似心智圖的互動方式開始，但從一開始就保留未來成長成更豐富思考系統的可能性。

## 為什麼會有這個專案

這個專案其實是三條已經被驗證過的路線，慢慢匯流出來的結果：

1. *IdeaCanvas* 證明了一個很好的互動模式，也就是「可編輯的視覺化節點 + AI 協助局部發散」。
2. *trip-planner* 證明了一個很重要的架構模式，也就是 Jarvis 不只是聊天，而是真的可以透過 SDK 直接修改底層結構化資料。
3. *thinking_with_ai* 證明了 Jones 的真實工作習慣，也就是會持續把想法寫進 repo，長期累積、重組、複利成長。

Thinking Canvas 想做的，就是把這三件事接起來，變成一個真正可長期使用的系統：

- 可視化
- 可編輯
- 可結構化保存
- 可由 Jarvis 協作操作
- 適合長期累積與重組

## 初期產品方向

第一版不應該急著直接做成完整知識圖譜系統。

v0 應該先專注在一個簡單但很強的循環：

1. Jones 建立或修改一個想法節點
2. Jarvis 可以直接幫忙新增、整理、展開、重組節點
3. 整個工作台維持視覺化且容易操作
4. 底層資料保持結構化且可持久保存

簡單講就是：

> 先做出一個像心智圖一樣好上手的思考畫布。
> 但底層資料模型不要把自己鎖死在純 tree，保留未來長成 graph 的可能性。

## 設計原則

### 1. 人主導，AI 增強
方向由人決定。
AI 負責協助發散、整理、重組、補充、維護結構。

### 2. 結構比聊天紀錄重要
重要想法應該變成可保存的節點，而不是散落在聊天訊息裡。

### 3. UI 與 Agent 都能操作
這是核心要求。
這套資料層必須同時適合 Jones 自己操作，也適合 Jarvis 穩定讀寫。

### 4. 互動上 tree-first，設計上 graph-ready
前期 UI 可以用 tree-like 的方式切入，因為比較直觀、好做、好理解。
但設計時不要把系統永遠限制在只有父子節點的世界。

### 5. Repo-backed thinking
這個專案的資料、結構、演進，都應該保持在 Jones 自己能理解、能掌控、能版本追蹤的範圍內。

## v0 早期範圍

### 必須先有
- 可視化 thought node 畫布
- 新增、編輯、刪除節點
- 結構化 persistence layer
- 清楚的 README 與架構文件
- 對 agent 友善的資料模型

### 很快可以加上
- 從單一節點出發的 AI 發散
- 節點 tags / types / metadata
- 從 repo 型知識來源匯入內容
- 多個 canvas / spaces
- 節點之間的輕量 cross-links

### 先不要做
- 完整 graph analytics
- 大規模自動抽取知識圖譜
- clustering / recommendation engine
- 很重的多人協作功能

## 初步架構方向

### 前端
- React + Vite
- 先用 canvas-style 或 SVG-based node view
- 優先做最小但可操作的編輯體驗

### 資料模型
第一版節點模型可以長這樣：

```json
{
  "nodes": [
    {
      "id": "root",
      "title": "Thinking Canvas",
      "content": "Main root thought",
      "children": ["n1", "n2"],
      "links": [],
      "tags": ["root"],
      "position": { "x": 0, "y": 0 }
    }
  ]
}
```

這種設計可以保留 tree-like 互動，同時為未來 graph link 留出口。

### Persistence 方向
目前可考慮的幾種路線：

1. 直接使用 repo 內 JSON 檔案
2. 使用 Firebase / Firestore 做結構化同步
3. local-first UI + remote structured store 的 hybrid 方案

第一版先保持簡單，優先 local-friendly。

## 建議資料夾結構

```text
thinking-canvas/
├── README.md
├── docs/
│   ├── product-direction.md
│   └── architecture-notes.md
├── src/
│   ├── components/
│   ├── lib/
│   └── data/
└── public/
```

## 接下來最直接的下一步

1. 建立最小 React app scaffold
2. 把第一版 node schema 定清楚
3. 做出最小可編輯 canvas
4. 放一份 sample dataset
5. 後續再接 agent-writable persistence

## 目前對這個專案的工作定義

Thinking Canvas 不只是筆記 app，也不只是心智圖。

它更像是一個屬於 Jones 的思考工作台，在這裡想法可以被：
- 建立
- 展開
- 重組
- 連接
- 保存
- 由 Jones 與 Jarvis 協作操作

## 狀態

這個 repo 現在已經完成第一版初始化，作為專案起點。

後面開始進入真正實作。

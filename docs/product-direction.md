# Product Direction

## 一句話定義
Thinking Canvas 是一個可視化、結構化、可由 agent 協作操作的長期思考工作台。

## 現在真正要解的問題
不是做一個「看起來很厲害的 AI app」，而是先做出一個：
- Jones 會真的打開來用
- Jarvis 可以穩定操作資料
- 能夠逐步演化的思考畫布

## v0 核心問題
Jones 有很多想法散落在聊天、repo、文件與腦中。
需要一個地方讓這些想法：
- 先被看見
- 先被結構化
- 先被操作
- 之後再逐步長成更大的知識系統

## 核心產品假設
以下假設目前都很強：

1. tree-first 的可視化互動，對早期使用最友善
2. 資料層如果從一開始就 agent-friendly，後面會非常省力
3. repo-backed / Firebase-backed 的結構，比純聊天紀錄更能形成長期複利
4. AI 在這個專案裡應該是增強器，不是第一主角

## v0 核心 loop
1. 打開畫布
2. 看到目前的思考結構
3. 建立或修改節點
4. 調整結構
5. 保存
6. 之後可讓 Jarvis 協作改動

## v0 成功標準
- 可部署到 Firebase Hosting
- 有最小可玩的畫布
- 節點 CRUD 能用
- 資料 schema 清楚
- 下一步 Firestore 對接不需要推倒重來

## 不做的事
v0 不做：
- Python backend
- 大規模 knowledge graph
- 複雜 graph query
- 自動抽取整個 repo/corpus 的語義關係
- 複雜多人協作系統

## 明天的實際目標
明天要上 Firebase，並且至少有一個初版可玩。

這代表任何現在的設計與實作，都應該以「降低明天上線阻力」為優先。

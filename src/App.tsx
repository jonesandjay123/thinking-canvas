import { CanvasView } from './components/CanvasView'
import { useCanvasStore } from './lib/store'

function App() {
  const store = useCanvasStore()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Thinking Canvas</p>
          <h1>{store.document.canvas.title}</h1>
          <p className="sidebar-copy">
            v0 可玩骨架版本，先把可編輯節點、清楚資料結構、以及 Firebase-ready 的下一步打穩。
          </p>
        </div>

        <div className="sidebar-panel">
          <h2>目前狀態</h2>
          <ul>
            <li>Tree-first、graph-ready 的 schema</li>
            <li>使用 localStorage 做本地保存</li>
            <li>最小節點 CRUD 已可運作</li>
          </ul>
        </div>

        <div className="sidebar-panel">
          <h2>快速操作</h2>
          <button onClick={() => store.createChild(store.document.canvas.rootNodeId)}>
            對根節點新增子節點
          </button>
          <button className="secondary" onClick={() => store.reset()}>
            重設範例畫布
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <CanvasView
          nodes={store.nodes}
          rootNodeId={store.document.canvas.rootNodeId}
          onAddChild={store.createChild}
          onDelete={store.deleteNode}
          onChange={store.updateNode}
        />
      </main>
    </div>
  )
}

export default App

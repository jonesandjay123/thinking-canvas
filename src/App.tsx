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
            v0 playable scaffold. Focus: editable nodes, clear structure, Firebase-ready next step.
          </p>
        </div>

        <div className="sidebar-panel">
          <h2>Current status</h2>
          <ul>
            <li>Tree-first, graph-ready schema</li>
            <li>Local persistence via localStorage</li>
            <li>Minimal node CRUD working</li>
          </ul>
        </div>

        <div className="sidebar-panel">
          <h2>Quick actions</h2>
          <button onClick={() => store.createChild(store.document.canvas.rootNodeId)}>
            Add child to root
          </button>
          <button className="secondary" onClick={() => store.reset()}>
            Reset sample canvas
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

import { useState } from 'react'
import { CanvasView } from './components/CanvasView'
import { generateChildSuggestions, geminiReady } from './lib/gemini'
import { useCanvasStore } from './lib/store'

function App() {
  const store = useCanvasStore()
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral')

  const handleGenerate = async (nodeId: string) => {
    const node = store.document.nodes[nodeId]
    if (!node) return

    setGeneratingNodeId(nodeId)
    setStatusMessage('')

    try {
      const suggestions = await generateChildSuggestions(store.document, node)
      if (suggestions.length === 0) {
        setStatusTone('error')
        setStatusMessage('Gemini 沒有產出可用建議，請再試一次。')
        return
      }

      suggestions.forEach((title) => {
        store.createChild(nodeId, {
          title,
          type: 'idea',
          content: '',
        })
      })

      setStatusTone('success')
      setStatusMessage(`Gemini 已為「${node.title}」新增 ${suggestions.length} 個子節點。`)
    } catch (error) {
      setStatusTone('error')
      setStatusMessage(error instanceof Error ? error.message : 'Gemini 展開失敗。')
    } finally {
      setGeneratingNodeId(null)
    }
  }

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
            <li>節點已可拖曳調整位置</li>
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

        <div className="sidebar-panel">
          <h2>Gemini Prototype</h2>
          <p className="sidebar-copy compact">
            {geminiReady()
              ? '已偵測到 VITE_GEMINI_API_KEY，可以使用「Gemini 展開」幫節點產生子節點建議。'
              : '尚未偵測到 VITE_GEMINI_API_KEY。若要在本地 prototype 使用 Gemini，請建立 .env.local。'}
          </p>
          <code className="env-hint">VITE_GEMINI_API_KEY=your_key_here</code>
          <code className="env-hint">VITE_GEMINI_MODEL=gemini-2.5-flash</code>
        </div>

        {statusMessage && <div className={`sidebar-panel status-panel ${statusTone}`}>{statusMessage}</div>}
      </aside>

      <main className="main-panel">
        <CanvasView
          nodes={store.nodes}
          rootNodeId={store.document.canvas.rootNodeId}
          generatingNodeId={generatingNodeId}
          geminiEnabled={geminiReady()}
          onAddChild={store.createChild}
          onDelete={store.deleteNode}
          onGenerate={handleGenerate}
          onChange={store.updateNode}
          onMove={store.moveNode}
        />
      </main>
    </div>
  )
}

export default App

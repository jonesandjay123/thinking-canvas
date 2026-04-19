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
      const suggestions = await generateChildSuggestions(store.document, node, store.aiExpandCount)
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
            第一輪先把互動骨架往 mind-map 靠，保留現在這套 dark mode 氣質不動。
          </p>
        </div>

        <div className="sidebar-panel">
          <h2>目前狀態</h2>
          <ul>
            <li>節點改成更輕量的概念 bubble</li>
            <li>節點之間已有 parent-child 連線</li>
            <li>可雙擊展開多個節點細節</li>
            <li>Gemini 可依 path 一次展開多個子節點</li>
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
          <h2>AI 展開設定</h2>
          <label className="field-label" htmlFor="ai-expand-count">
            每次產生幾個子節點
          </label>
          <select
            id="ai-expand-count"
            className="select-input"
            value={store.aiExpandCount}
            onChange={(event) => store.setAiExpandCount(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
          <p className="sidebar-copy compact">
            {geminiReady()
              ? 'Gemini 會根據目前節點、path 與整張畫布脈絡，一次展開多個子節點。'
              : '尚未偵測到 Gemini API key，目前仍可先手動建立與編輯節點。'}
          </p>
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

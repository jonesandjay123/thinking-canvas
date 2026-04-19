import { useMemo, useState } from 'react'
import { CanvasView } from './components/CanvasView'
import { generateChildSuggestions, geminiReady } from './lib/gemini'
import { useCanvasStore } from './lib/store'
import type { ControlDock } from './types/canvas'

const dockOptions: ControlDock[] = ['top', 'right', 'bottom', 'left']

function App() {
  const store = useCanvasStore()
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral')

  const themeLabel = useMemo(() => (store.theme === 'dark' ? '切換到 Light' : '切換到 Dark'), [store.theme])

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
    <div className={`app-shell theme-${store.theme}`}>
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Thinking Canvas</p>
          <h1>{store.document.canvas.title}</h1>
          <p className="sidebar-copy">把真正會用到的控制留在左側，把沒意義的說明拿掉。</p>
        </div>

        <div className="sidebar-panel">
          <h2>畫布控制</h2>
          <label className="field-label" htmlFor="ai-expand-count">
            AI 展開數量
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

          <label className="field-label field-label--spaced" htmlFor="control-dock">
            Hover 控制位置
          </label>
          <select
            id="control-dock"
            className="select-input"
            value={store.controlDock}
            onChange={(event) => store.setControlDock(event.target.value as ControlDock)}
          >
            {dockOptions.map((dock) => (
              <option key={dock} value={dock}>
                {dock}
              </option>
            ))}
          </select>

          <button className="secondary" onClick={() => store.setTheme(store.theme === 'dark' ? 'light' : 'dark')}>
            {themeLabel}
          </button>
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
          <h2>Gemini</h2>
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
          controlDock={store.controlDock}
          theme={store.theme}
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

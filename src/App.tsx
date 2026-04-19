import { useEffect, useState } from 'react'
import { FlowCanvas } from './components/FlowCanvas'
import { useCanvasStore } from './lib/store'
import { geminiReady } from './lib/gemini'
import type { ControlDock, FlowDirection } from './types/canvas'

const dockOptions: ControlDock[] = ['top', 'right', 'bottom', 'left']
const directionOptions: FlowDirection[] = ['TB', 'BT', 'LR', 'RL']

function App() {
  const store = useCanvasStore()
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.theme)
  }, [store.theme])

  return (
    <div className={`app-shell theme-${store.theme}`}>
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Thinking Canvas</p>
          <h1>{store.document.canvas.title}</h1>
          <p className="sidebar-copy">核心畫布已改成 React Flow，現在把控制面板收斂成真正有用的設定。</p>
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

          <label className="field-label field-label--spaced" htmlFor="flow-direction">
            方位流向
          </label>
          <div className="direction-grid" id="flow-direction">
            {directionOptions.map((direction) => (
              <button
                key={direction}
                className={`secondary direction-button ${store.flowDirection === direction ? 'active' : ''}`}
                onClick={() => store.setFlowDirection(direction)}
              >
                {direction}
              </button>
            ))}
          </div>

          <button className="secondary" onClick={() => store.setTheme(store.theme === 'dark' ? 'light' : 'dark')}>
            {store.theme === 'dark' ? '切換到 Light' : '切換到 Dark'}
          </button>
        </div>

        {statusMessage && <div className={`sidebar-panel status-panel ${statusTone}`}>{statusMessage}</div>}
      </aside>

      <main className="main-panel">
        <FlowCanvas
          document={store.document}
          aiExpandCount={store.aiExpandCount}
          controlDock={store.controlDock}
          flowDirection={store.flowDirection}
          theme={store.theme}
          geminiEnabled={geminiReady()}
          onDocumentChange={store.setDocument}
          onStatus={(message, tone) => {
            setStatusMessage(message)
            setStatusTone(tone)
          }}
        />
      </main>
    </div>
  )
}

export default App

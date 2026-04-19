import { useEffect, useState } from 'react'
import { FlowCanvas } from './components/FlowCanvas'
import { useCanvasStore } from './lib/store'
import { geminiReady } from './lib/gemini'
import type { ControlDock } from './types/canvas'

const dockOptions: ControlDock[] = ['top', 'right', 'bottom', 'left']

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
          <p className="sidebar-copy">核心畫布已改成 React Flow，後面 zoom、edges、minimap、controls 都比較好擴充。</p>
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
            {store.theme === 'dark' ? '切換到 Light' : '切換到 Dark'}
          </button>
        </div>

        <div className="sidebar-panel">
          <h2>快速操作</h2>
          <button onClick={() => setStatusMessage('請直接用節點上的 + 來新增，這樣會更符合 flow 式操作。')}>
            提示我怎麼新增節點
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
              : '尚未偵測到 Gemini API key，目前仍可先操作結構與節點內容。'}
          </p>
        </div>

        {statusMessage && <div className={`sidebar-panel status-panel ${statusTone}`}>{statusMessage}</div>}
      </aside>

      <main className="main-panel">
        <FlowCanvas
          document={store.document}
          aiExpandCount={store.aiExpandCount}
          controlDock={store.controlDock}
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

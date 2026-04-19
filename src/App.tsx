import { useEffect, useState } from 'react'
import { FlowCanvas } from './components/FlowCanvas'
import { useCanvasStore } from './lib/store'
import { geminiReady } from './lib/gemini'
import type { FlowDirection, NodeShape, NodeSize, NodeTextScale } from './types/canvas'

const directionOptions: FlowDirection[] = ['TB', 'BT', 'LR', 'RL']
const textScaleOptions: NodeTextScale[] = [12, 14, 16, 20, 24, 28, 32]
const shapeOptions: { value: NodeShape; label: string }[] = [
  { value: 'circle', label: '圓形' },
  { value: 'ellipse', label: '橢圓' },
  { value: 'rounded-rect', label: '弧角長方形' },
  { value: 'rounded-square', label: '弧角正方形' },
]
const sizeOptions: NodeSize[] = [140, 180, 220, 260]

function getDockForDirection(direction: FlowDirection) {
  switch (direction) {
    case 'TB':
      return 'bottom'
    case 'BT':
      return 'top'
    case 'LR':
      return 'right'
    case 'RL':
      return 'left'
    default:
      return 'bottom'
  }
}

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

          <label className="field-label field-label--spaced" htmlFor="node-shape">
            節點形狀
          </label>
          <select
            id="node-shape"
            className="select-input"
            value={store.nodeShape}
            onChange={(event) => store.setNodeShape(event.target.value as NodeShape)}
          >
            {shapeOptions.map((shape) => (
              <option key={shape.value} value={shape.value}>
                {shape.label}
              </option>
            ))}
          </select>

          <label className="field-label field-label--spaced" htmlFor="node-size">
            節點大小
          </label>
          <select
            id="node-size"
            className="select-input"
            value={store.nodeSize}
            onChange={(event) => store.setNodeSize(Number(event.target.value) as NodeSize)}
          >
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>

          <label className="field-label field-label--spaced" htmlFor="node-text-scale">
            節點文字大小
          </label>
          <select
            id="node-text-scale"
            className="select-input"
            value={store.nodeTextScale}
            onChange={(event) => store.setNodeTextScale(Number(event.target.value) as NodeTextScale)}
          >
            {textScaleOptions.map((scale) => (
              <option key={scale} value={scale}>
                {scale}px
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
                onClick={() => {
                  store.setFlowDirection(direction)
                  store.setControlDock(getDockForDirection(direction))
                }}
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
          nodeTextScale={store.nodeTextScale}
          nodeShape={store.nodeShape}
          nodeSize={store.nodeSize}
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

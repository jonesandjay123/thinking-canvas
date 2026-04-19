import { useEffect, useRef, useState } from 'react'
import { FlowCanvas } from './components/FlowCanvas'
import { useCanvasStore } from './lib/store'
import { geminiReady } from './lib/gemini'
import { createSaveFileV1, parseSaveFileV1 } from './lib/save-file'
import type { FlowDirection, NodeShape, NodeSize, NodeTextScale } from './types/canvas'

const directionOptions: FlowDirection[] = ['TB', 'BT', 'LR', 'RL']
const textScaleOptions: NodeTextScale[] = [12, 14, 16, 20, 24, 28, 32]
const shapeOptions: { value: NodeShape; label: string }[] = [
  { value: 'circle', label: '圓形' },
  { value: 'ellipse', label: '橢圓' },
  { value: 'rounded-rect', label: '弧角長方形' },
  { value: 'rounded-square', label: '弧角正方形' },
]
const sizeOptions: NodeSize[] = [80, 120, 160, 200]

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

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatTimestampFilename(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

function App() {
  const store = useCanvasStore()
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', store.theme)
  }, [store.theme])

  const handleExport = () => {
    const saveFile = createSaveFileV1({
      document: store.document,
      flowDirection: store.flowDirection,
      nodeShape: store.nodeShape,
      nodeSize: store.nodeSize,
      nodeTextScale: store.nodeTextScale,
    })
    const safeTitle = (store.document.canvas.title || 'thinking-canvas').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
    const timestamp = formatTimestampFilename()
    downloadTextFile(`${safeTitle || 'thinking-canvas'}-${timestamp}.json`, JSON.stringify(saveFile, null, 2))
    setStatusMessage('已匯出 save file v1 JSON。')
    setStatusTone('success')
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const parsed = parseSaveFileV1(raw)
      store.importState({
        document: parsed.document,
        presentation: parsed.presentation,
      })
      setStatusMessage(`已匯入 ${file.name}`)
      setStatusTone('success')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '匯入失敗。')
      setStatusTone('error')
    } finally {
      event.target.value = ''
    }
  }

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

          <div className="stack-actions field-label--spaced">
            <button className="secondary" onClick={handleExport}>
              匯出 JSON
            </button>
            <button className="secondary" onClick={handleImportClick}>
              匯入 JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
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

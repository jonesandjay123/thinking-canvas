import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlowCanvas } from './components/FlowCanvas'
import { useCanvasStore } from './lib/store'
import { geminiReady } from './lib/gemini'
import { createSaveFileV1, parseSaveFileV1 } from './lib/save-file'
import { logOut, signInWithGoogle, subscribeToAuthState } from './lib/auth'
import type { FlowDirection, NodeShape, NodeSize, NodeTextScale } from './types/canvas'

const OWNER_EMAIL = 'jonesandjay123@gmail.com'

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

type AutosaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

function App() {
  const store = useCanvasStore()
  const setAuthState = useCanvasStore((state) => state.setAuthState)
  const document = useCanvasStore((state) => state.document)
  const flowDirection = useCanvasStore((state) => state.flowDirection)
  const nodeShape = useCanvasStore((state) => state.nodeShape)
  const nodeSize = useCanvasStore((state) => state.nodeSize)
  const nodeTextScale = useCanvasStore((state) => state.nodeTextScale)
  const user = useCanvasStore((state) => state.user)
  const saveToCloud = useCanvasStore((state) => state.saveToCloud)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'error'>('neutral')
  const [cloudBusy, setCloudBusy] = useState<'save' | 'load' | null>(null)
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('idle')
  const [dataSourceLabel, setDataSourceLabel] = useState<'local' | 'cloud' | 'fallback'>('local')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const autosaveTimerRef = useRef<number | null>(null)
  const lastSavedSignatureRef = useRef<string | null>(null)
  const suppressNextAutosaveRef = useRef(false)
  const latestSaveSeqRef = useRef(0)
  const attemptedInitialCloudLoadRef = useRef(false)
  const isOwner = store.user?.email === OWNER_EMAIL
  const canEdit = !store.authLoading && isOwner

  useEffect(() => {
    globalThis.document.documentElement.setAttribute('data-theme', store.theme)
  }, [store.theme])

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((user) => {
      setAuthState({ loading: false, user })

      if (!user) {
        attemptedInitialCloudLoadRef.current = false
      }

      if (import.meta.env.DEV) {
        console.debug('[auth state]', {
          email: user?.email ?? null,
          uid: user?.uid ?? null,
        })
      }
    })

    return unsubscribe
  }, [setAuthState])

  const autosaveSignature = useMemo(
    () =>
      JSON.stringify({
        document,
        presentation: {
          flowDirection,
          nodeShape,
          nodeSize,
          nodeTextScale,
        },
        uid: user?.uid ?? null,
        canEdit,
      }),
    [document, flowDirection, nodeShape, nodeSize, nodeTextScale, user?.uid, canEdit],
  )

  useEffect(() => {
    if (!canEdit || !user || cloudBusy === 'load') {
      return
    }

    if (suppressNextAutosaveRef.current) {
      suppressNextAutosaveRef.current = false
      lastSavedSignatureRef.current = autosaveSignature
      setAutosaveState('idle')
      return
    }

    if (autosaveSignature === lastSavedSignatureRef.current) {
      return
    }

    setAutosaveState('dirty')

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      const seq = ++latestSaveSeqRef.current
      setAutosaveState('saving')

      try {
        await saveToCloud()
        if (seq !== latestSaveSeqRef.current) return

        lastSavedSignatureRef.current = autosaveSignature
        setAutosaveState('saved')
      } catch {
        if (seq !== latestSaveSeqRef.current) return
        setAutosaveState('error')
      }
    }, 1500)

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [autosaveSignature, canEdit, user, cloudBusy, saveToCloud])

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

  const handleLogin = async () => {
    try {
      await signInWithGoogle()
      setStatusMessage('已登入 Google。')
      setStatusTone('success')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Google 登入失敗。')
      setStatusTone('error')
    }
  }

  const handleLogout = async () => {
    try {
      await logOut()
      setStatusMessage('已登出。')
      setStatusTone('success')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '登出失敗。')
      setStatusTone('error')
    }
  }

  const handleCloudSave = async () => {
    try {
      setCloudBusy('save')
      if (import.meta.env.DEV) {
        console.debug('[cloud save:start]', {
          canvasId: store.document.canvas.id,
          nodeCount: Object.keys(store.document.nodes).length,
        })
      }
      await store.saveToCloud()
      lastSavedSignatureRef.current = autosaveSignature
      setAutosaveState('saved')
      setStatusMessage('已儲存到 Firestore。')
      setStatusTone('success')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '雲端儲存失敗。')
      setStatusTone('error')
    } finally {
      setCloudBusy(null)
    }
  }

  const handleCloudLoad = useCallback(async (options?: { silent?: boolean; reason?: 'manual' | 'initial' }) => {
    try {
      setCloudBusy('load')
      if (import.meta.env.DEV) {
        console.debug('[cloud load:start]', {
          canvasId: store.document.canvas.id,
          localNodeCount: Object.keys(store.document.nodes).length,
          reason: options?.reason ?? 'manual',
        })
      }
      const loaded = await store.loadFromCloud()
      if (!loaded) {
        setAutosaveState('idle')
        setDataSourceLabel('fallback')
        if (!options?.silent) {
          setStatusMessage('雲端尚未有這張 canvas 的存檔，已保留目前本地畫布。')
          setStatusTone('neutral')
        }
        return false
      }
      suppressNextAutosaveRef.current = true
      setAutosaveState('idle')
      setDataSourceLabel('cloud')
      if (!options?.silent) {
        setStatusMessage(options?.reason === 'initial' ? '已自動從 Firestore 載入目前 canvas。' : '已從 Firestore 載入，並覆蓋本地狀態。')
        setStatusTone('success')
      }
      return true
    } catch (error) {
      if (!options?.silent) {
        setStatusMessage(error instanceof Error ? error.message : '雲端載入失敗。')
        setStatusTone('error')
      }
      throw error
    } finally {
      setCloudBusy(null)
    }
  }, [store])

  useEffect(() => {
    if (store.authLoading || !user || !canEdit || attemptedInitialCloudLoadRef.current) {
      return
    }

    attemptedInitialCloudLoadRef.current = true

    void handleCloudLoad({ silent: false, reason: 'initial' }).catch(() => {
      setDataSourceLabel('local')
    })
  }, [store.authLoading, user, canEdit, handleCloudLoad])

  const handleFlowStatus = useCallback((message: string, tone: 'neutral' | 'success' | 'error') => {
    setStatusMessage(message)
    setStatusTone(tone)
  }, [])

  return (
    <div className={`app-shell theme-${store.theme}`}>
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Thinking Canvas</p>
          <h1>{store.document.canvas.title}</h1>
          <p className="sidebar-copy">核心畫布已改成 React Flow，現在把控制面板收斂成真正有用的設定。</p>
        </div>

        <div className="sidebar-panel">
          <h2>登入狀態</h2>
          {store.authLoading ? (
            <p className="sidebar-copy auth-copy">正在確認登入狀態...</p>
          ) : store.isLoggedIn ? (
            <div className="auth-stack">
              <p className="sidebar-copy auth-copy">已登入：{store.user?.email ?? 'unknown user'}</p>
              <p className={`auth-mode ${canEdit ? 'owner' : 'viewer'}`}>{canEdit ? 'Owner mode' : 'View only mode'}</p>
              <button className="secondary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="auth-stack">
              <p className="sidebar-copy auth-copy">目前未登入，先接好 Google Auth 流程。</p>
              <p className="auth-mode viewer">View only mode</p>
              <button onClick={handleLogin}>Login with Google</button>
            </div>
          )}
        </div>

        <div className="sidebar-panel">
          <h2>畫布控制</h2>
          <p className={`autosave-state autosave-state--${autosaveState}`}>
            {autosaveState === 'dirty' && 'Unsaved cloud changes'}
            {autosaveState === 'saving' && 'Saving...'}
            {autosaveState === 'saved' && 'Saved'}
            {autosaveState === 'error' && 'Autosave failed'}
            {autosaveState === 'idle' && 'Cloud autosave idle'}
          </p>
          <p className="sidebar-copy auth-copy">
            Data source: {dataSourceLabel === 'cloud' ? 'Firestore cloud state' : dataSourceLabel === 'fallback' ? 'local fallback / starter canvas' : 'local browser state'}
          </p>
          {!canEdit && <p className="sidebar-copy auth-copy">目前是唯讀模式，只有 owner 可以新增、刪除、拖曳或編輯節點。</p>}
          <label className="field-label" htmlFor="ai-expand-count">
            AI 展開數量
          </label>
          <select
            id="ai-expand-count"
            className="select-input"
            value={store.aiExpandCount}
            onChange={(event) => store.setAiExpandCount(Number(event.target.value))}
            disabled={!canEdit}
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
            disabled={!canEdit}
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
            disabled={!canEdit}
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
            disabled={!canEdit}
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
                  if (!canEdit) return
                  store.setFlowDirection(direction)
                  store.setControlDock(getDockForDirection(direction))
                }}
                disabled={!canEdit}
              >
                {direction}
              </button>
            ))}
          </div>

          <div className="stack-actions field-label--spaced">
            <button className="secondary" onClick={handleExport}>
              匯出 JSON
            </button>
            <button className="secondary" onClick={handleImportClick} disabled={!canEdit}>
              匯入 JSON
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
          </div>

          <div className="stack-actions field-label--spaced">
            <button className="secondary" onClick={handleCloudSave} disabled={!canEdit || cloudBusy !== null}>
              {cloudBusy === 'save' ? '儲存中...' : 'Save to Cloud'}
            </button>
            <button className="secondary" onClick={() => void handleCloudLoad({ reason: 'manual' })} disabled={!canEdit || cloudBusy !== null}>
              {cloudBusy === 'load' ? '載入中...' : 'Load from Cloud'}
            </button>
          </div>

          <button className="secondary" onClick={() => store.setTheme(store.theme === 'dark' ? 'light' : 'dark')} disabled={!canEdit}>
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
          canEdit={canEdit}
          onDocumentChange={store.setDocument}
          onStatus={handleFlowStatus}
        />
      </main>
    </div>
  )
}

export default App

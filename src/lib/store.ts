import { useEffect, useMemo, useState } from 'react'
import sampleCanvas from '../data/sample-canvas.json'
import type {
  CanvasDocument,
  ControlDock,
  FlowDirection,
  NodeShape,
  NodeSize,
  NodeTextScale,
  ThemeMode,
  ThoughtNode,
} from '../types/canvas'
import { createNode, deleteNode, moveNode, updateNode } from './actions'

const STORAGE_KEY = 'thinking-canvas-document'
const UI_STORAGE_KEY = 'thinking-canvas-ui'

function loadInitialDocument(): CanvasDocument {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return JSON.parse(saved) as CanvasDocument
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  return sampleCanvas as CanvasDocument
}

function loadUiSettings(): {
  aiExpandCount: number
  controlDock: ControlDock
  theme: ThemeMode
  flowDirection: FlowDirection
  nodeTextScale: NodeTextScale
  nodeShape: NodeShape
  nodeSize: NodeSize
} {
  const saved = localStorage.getItem(UI_STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<{
        aiExpandCount: number
        controlDock: ControlDock
        theme: ThemeMode
        flowDirection: FlowDirection
        nodeTextScale: NodeTextScale
        nodeShape: NodeShape
        nodeSize: NodeSize
      }>
      return {
        aiExpandCount: Math.min(5, Math.max(1, parsed.aiExpandCount ?? 3)),
        controlDock: parsed.controlDock ?? 'top',
        theme: parsed.theme ?? 'dark',
        flowDirection: parsed.flowDirection ?? 'TB',
        nodeTextScale: parsed.nodeTextScale ?? 20,
        nodeShape: parsed.nodeShape ?? 'circle',
        nodeSize: parsed.nodeSize ?? 160,
      }
    } catch {
      localStorage.removeItem(UI_STORAGE_KEY)
    }
  }
  return {
    aiExpandCount: 3,
    controlDock: 'top',
    theme: 'dark',
    flowDirection: 'TB',
    nodeTextScale: 20,
    nodeShape: 'circle',
    nodeSize: 160,
  }
}

export interface CanvasStore {
  document: CanvasDocument
  nodes: ThoughtNode[]
  aiExpandCount: number
  controlDock: ControlDock
  theme: ThemeMode
  flowDirection: FlowDirection
  nodeTextScale: NodeTextScale
  nodeShape: NodeShape
  nodeSize: NodeSize
  createChild: (parentId: string, partial?: Partial<ThoughtNode>) => void
  updateNode: (nodeId: string, patch: Partial<ThoughtNode>) => void
  deleteNode: (nodeId: string) => void
  moveNode: (nodeId: string, position: ThoughtNode['position']) => void
  setAiExpandCount: (count: number) => void
  setControlDock: (dock: ControlDock) => void
  setTheme: (theme: ThemeMode) => void
  setFlowDirection: (direction: FlowDirection) => void
  setNodeTextScale: (scale: NodeTextScale) => void
  setNodeShape: (shape: NodeShape) => void
  setNodeSize: (size: NodeSize) => void
  setDocument: (document: CanvasDocument) => void
  reset: () => void
}

export function useCanvasStore(): CanvasStore {
  const [document, setDocumentState] = useState<CanvasDocument>(() => loadInitialDocument())
  const [ui, setUi] = useState(() => loadUiSettings())

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(ui))
  }, [ui])

  const persist = (nextDocument: CanvasDocument) => {
    setDocumentState(nextDocument)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDocument))
  }

  const nodes = useMemo(() => Object.values(document.nodes), [document])

  return {
    document,
    nodes,
    aiExpandCount: ui.aiExpandCount,
    controlDock: ui.controlDock,
    theme: ui.theme,
    flowDirection: ui.flowDirection,
    nodeTextScale: ui.nodeTextScale,
    nodeShape: ui.nodeShape,
    nodeSize: ui.nodeSize,
    createChild: (parentId: string, partial?: Partial<ThoughtNode>) =>
      persist(createNode(document, parentId, partial)),
    updateNode: (nodeId: string, patch: Partial<ThoughtNode>) =>
      persist(updateNode(document, nodeId, patch)),
    deleteNode: (nodeId: string) => persist(deleteNode(document, nodeId)),
    moveNode: (nodeId: string, position: ThoughtNode['position']) =>
      persist(moveNode(document, nodeId, position)),
    setAiExpandCount: (count: number) =>
      setUi((current) => ({ ...current, aiExpandCount: Math.min(5, Math.max(1, count)) })),
    setControlDock: (dock: ControlDock) => setUi((current) => ({ ...current, controlDock: dock })),
    setTheme: (theme: ThemeMode) => setUi((current) => ({ ...current, theme })),
    setFlowDirection: (flowDirection: FlowDirection) => setUi((current) => ({ ...current, flowDirection })),
    setNodeTextScale: (nodeTextScale: NodeTextScale) => setUi((current) => ({ ...current, nodeTextScale })),
    setNodeShape: (nodeShape: NodeShape) => setUi((current) => ({ ...current, nodeShape })),
    setNodeSize: (nodeSize: NodeSize) => setUi((current) => ({ ...current, nodeSize })),
    setDocument: (nextDocument: CanvasDocument) => persist(nextDocument),
    reset: () => {
      localStorage.removeItem(STORAGE_KEY)
      persist(sampleCanvas as CanvasDocument)
    },
  }
}

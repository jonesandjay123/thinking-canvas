import type { User } from 'firebase/auth'
import { create } from 'zustand'
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
import { loadFromCloud, saveToCloud } from './cloud'

const fallbackDocument = sampleCanvas as CanvasDocument
const STORAGE_KEY = 'thinking-canvas-document'
const UI_STORAGE_KEY = 'thinking-canvas-ui'

type UiSettings = {
  aiExpandCount: number
  controlDock: ControlDock
  theme: ThemeMode
  flowDirection: FlowDirection
  nodeTextScale: NodeTextScale
  nodeShape: NodeShape
  nodeSize: NodeSize
}

const defaultUiSettings: UiSettings = {
  aiExpandCount: 3,
  controlDock: 'top',
  theme: 'dark',
  flowDirection: 'TB',
  nodeTextScale: 20,
  nodeShape: 'circle',
  nodeSize: 120,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeDocument(value: unknown): CanvasDocument | null {
  if (!isRecord(value) || !isRecord(value.canvas) || !isRecord(value.nodes)) return null

  const canvas = value.canvas
  if (
    typeof canvas.id !== 'string' ||
    typeof canvas.title !== 'string' ||
    typeof canvas.rootNodeId !== 'string' ||
    typeof canvas.createdAt !== 'string' ||
    typeof canvas.updatedAt !== 'string'
  ) {
    return null
  }

  if (!(canvas.rootNodeId in value.nodes) || Object.keys(value.nodes).length === 0) return null

  return value as unknown as CanvasDocument
}

function loadInitialDocument(): CanvasDocument {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as unknown
      const normalized = normalizeDocument(parsed)
      if (normalized) {
        return normalized
      }
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }
  return fallbackDocument
}

function loadUiSettings(): UiSettings {
  const saved = localStorage.getItem(UI_STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<UiSettings>
      return {
        aiExpandCount: Math.min(5, Math.max(1, parsed.aiExpandCount ?? defaultUiSettings.aiExpandCount)),
        controlDock: parsed.controlDock ?? defaultUiSettings.controlDock,
        theme: parsed.theme ?? defaultUiSettings.theme,
        flowDirection: parsed.flowDirection ?? defaultUiSettings.flowDirection,
        nodeTextScale: parsed.nodeTextScale ?? defaultUiSettings.nodeTextScale,
        nodeShape: parsed.nodeShape ?? defaultUiSettings.nodeShape,
        nodeSize: parsed.nodeSize ?? defaultUiSettings.nodeSize,
      }
    } catch {
      localStorage.removeItem(UI_STORAGE_KEY)
    }
  }
  return defaultUiSettings
}

const initialDocument = loadInitialDocument()
const initialUi = loadUiSettings()

type AuthState = {
  loading: boolean
  user: User | null
}

export interface CanvasStore extends UiSettings {
  document: CanvasDocument
  nodes: ThoughtNode[]
  authLoading: boolean
  isLoggedIn: boolean
  user: User | null
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
  importState: (input: { document: CanvasDocument; presentation: Pick<UiSettings, 'flowDirection' | 'nodeShape' | 'nodeSize' | 'nodeTextScale'> }) => void
  saveToCloud: () => Promise<void>
  loadFromCloud: () => Promise<boolean>
  setAuthState: (input: AuthState) => void
  reset: () => void
}

function persistDocument(nextDocument: CanvasDocument, set: (partial: Partial<CanvasStore>) => void) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDocument))
  set({
    document: nextDocument,
    nodes: Object.values(nextDocument.nodes),
  })
}

function persistUi(nextUi: Partial<UiSettings>, set: (updater: (state: CanvasStore) => Partial<CanvasStore>) => void) {
  set((state) => {
    const merged = {
      aiExpandCount: nextUi.aiExpandCount ?? state.aiExpandCount,
      controlDock: nextUi.controlDock ?? state.controlDock,
      theme: nextUi.theme ?? state.theme,
      flowDirection: nextUi.flowDirection ?? state.flowDirection,
      nodeTextScale: nextUi.nodeTextScale ?? state.nodeTextScale,
      nodeShape: nextUi.nodeShape ?? state.nodeShape,
      nodeSize: nextUi.nodeSize ?? state.nodeSize,
    }
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(merged))
    return merged
  })
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  document: initialDocument,
  nodes: Object.values(initialDocument.nodes),
  authLoading: true,
  isLoggedIn: false,
  user: null,
  ...initialUi,
  createChild: (parentId, partial) => {
    const nextDocument = createNode(get().document, parentId, partial)
    persistDocument(nextDocument, set)
  },
  updateNode: (nodeId, patch) => {
    const nextDocument = updateNode(get().document, nodeId, patch)
    persistDocument(nextDocument, set)
  },
  deleteNode: (nodeId) => {
    const nextDocument = deleteNode(get().document, nodeId)
    persistDocument(nextDocument, set)
  },
  moveNode: (nodeId, position) => {
    const nextDocument = moveNode(get().document, nodeId, position)
    persistDocument(nextDocument, set)
  },
  setAiExpandCount: (count) => persistUi({ aiExpandCount: Math.min(5, Math.max(1, count)) }, set),
  setControlDock: (dock) => persistUi({ controlDock: dock }, set),
  setTheme: (theme) => persistUi({ theme }, set),
  setFlowDirection: (flowDirection) => persistUi({ flowDirection }, set),
  setNodeTextScale: (nodeTextScale) => persistUi({ nodeTextScale }, set),
  setNodeShape: (nodeShape) => persistUi({ nodeShape }, set),
  setNodeSize: (nodeSize) => persistUi({ nodeSize }, set),
  setDocument: (document) => persistDocument(document, set),
  importState: ({ document, presentation }) => {
    persistDocument(document, set)
    persistUi(
      {
        flowDirection: presentation.flowDirection,
        nodeShape: presentation.nodeShape,
        nodeSize: presentation.nodeSize,
        nodeTextScale: presentation.nodeTextScale,
      },
      set,
    )
  },
  saveToCloud: async () => {
    const state = get()
    if (!state.user) {
      throw new Error('請先登入後再儲存到雲端。')
    }

    await saveToCloud({
      uid: state.user.uid,
      canvasId: state.document.canvas.id,
      document: state.document,
      presentation: {
        flowDirection: state.flowDirection,
        nodeShape: state.nodeShape,
        nodeSize: state.nodeSize,
        nodeTextScale: state.nodeTextScale,
      },
    })
  },
  loadFromCloud: async () => {
    const state = get()
    if (!state.user) {
      throw new Error('請先登入後再從雲端載入。')
    }

    const cloudState = await loadFromCloud({
      uid: state.user.uid,
      canvasId: state.document.canvas.id,
    })

    if (!cloudState) {
      return false
    }

    const nextDocument = normalizeDocument(cloudState.document) ?? fallbackDocument
    persistDocument(nextDocument, set)
    persistUi(
      {
        flowDirection: cloudState.presentation.flowDirection,
        nodeShape: cloudState.presentation.nodeShape,
        nodeSize: cloudState.presentation.nodeSize,
        nodeTextScale: cloudState.presentation.nodeTextScale,
      },
      set,
    )
    return true
  },
  setAuthState: ({ loading, user }) => {
    set({
      authLoading: loading,
      isLoggedIn: Boolean(user),
      user,
    })
  },
  reset: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(UI_STORAGE_KEY)
    persistDocument(fallbackDocument, set)
    persistUi(defaultUiSettings, set)
  },
}))

import { useMemo, useState } from 'react'
import sampleCanvas from '../data/sample-canvas.json'
import type { CanvasDocument, ThoughtNode } from '../types/canvas'
import { createNode, deleteNode, moveNode, updateNode } from './actions'

const STORAGE_KEY = 'thinking-canvas-document'

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

export interface CanvasStore {
  document: CanvasDocument
  nodes: ThoughtNode[]
  createChild: (parentId: string) => void
  updateNode: (nodeId: string, patch: Partial<ThoughtNode>) => void
  deleteNode: (nodeId: string) => void
  moveNode: (nodeId: string, position: ThoughtNode['position']) => void
  reset: () => void
}

export function useCanvasStore(): CanvasStore {
  const [document, setDocument] = useState<CanvasDocument>(() => loadInitialDocument())

  const persist = (nextDocument: CanvasDocument) => {
    setDocument(nextDocument)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDocument))
  }

  const nodes = useMemo(() => Object.values(document.nodes), [document])

  return {
    document,
    nodes,
    createChild: (parentId: string) => persist(createNode(document, parentId)),
    updateNode: (nodeId: string, patch: Partial<ThoughtNode>) =>
      persist(updateNode(document, nodeId, patch)),
    deleteNode: (nodeId: string) => persist(deleteNode(document, nodeId)),
    moveNode: (nodeId: string, position: ThoughtNode['position']) =>
      persist(moveNode(document, nodeId, position)),
    reset: () => {
      localStorage.removeItem(STORAGE_KEY)
      persist(sampleCanvas as CanvasDocument)
    },
  }
}

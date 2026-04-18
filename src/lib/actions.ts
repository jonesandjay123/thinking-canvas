import type { CanvasDocument, ThoughtNode } from '../types/canvas'

const now = () => new Date().toISOString()
const createId = () => Math.random().toString(36).slice(2, 10)

export function createNode(
  document: CanvasDocument,
  parentId: string,
  partial?: Partial<ThoughtNode>,
): CanvasDocument {
  const parent = document.nodes[parentId]
  if (!parent) return document

  const id = partial?.id ?? createId()
  const timestamp = now()
  const childIndex = parent.childIds.length

  const newNode: ThoughtNode = {
    id,
    canvasId: document.canvas.id,
    title: partial?.title ?? 'New Node',
    content: partial?.content ?? '',
    childIds: partial?.childIds ?? [],
    parentId,
    links: partial?.links ?? [],
    tags: partial?.tags ?? [],
    type: partial?.type ?? 'note',
    position: partial?.position ?? {
      x: parent.position.x + childIndex * 220 - Math.max(0, childIndex - 1) * 110,
      y: parent.position.y + 220,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  return {
    canvas: { ...document.canvas, updatedAt: timestamp },
    nodes: {
      ...document.nodes,
      [parentId]: {
        ...parent,
        childIds: [...parent.childIds, id],
        updatedAt: timestamp,
      },
      [id]: newNode,
    },
  }
}

export function updateNode(
  document: CanvasDocument,
  nodeId: string,
  patch: Partial<ThoughtNode>,
): CanvasDocument {
  const node = document.nodes[nodeId]
  if (!node) return document

  const timestamp = now()
  return {
    canvas: { ...document.canvas, updatedAt: timestamp },
    nodes: {
      ...document.nodes,
      [nodeId]: {
        ...node,
        ...patch,
        updatedAt: timestamp,
      },
    },
  }
}

export function moveNode(
  document: CanvasDocument,
  nodeId: string,
  position: ThoughtNode['position'],
): CanvasDocument {
  return updateNode(document, nodeId, { position })
}

export function deleteNode(document: CanvasDocument, nodeId: string): CanvasDocument {
  const node = document.nodes[nodeId]
  if (!node || node.parentId === null) return document

  const nextNodes = { ...document.nodes }
  const timestamp = now()

  const removeRecursively = (targetId: string) => {
    const target = nextNodes[targetId]
    if (!target) return
    target.childIds.forEach(removeRecursively)
    delete nextNodes[targetId]
  }

  removeRecursively(nodeId)

  const parent = nextNodes[node.parentId]
  if (parent) {
    nextNodes[node.parentId] = {
      ...parent,
      childIds: parent.childIds.filter((childId) => childId !== nodeId),
      updatedAt: timestamp,
    }
  }

  return {
    canvas: { ...document.canvas, updatedAt: timestamp },
    nodes: nextNodes,
  }
}

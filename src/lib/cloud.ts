import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  CanvasDocument,
  FlowDirection,
  NodeShape,
  NodeSize,
  NodeTextScale,
} from '../types/canvas'

type CloudPresentation = {
  flowDirection: FlowDirection
  nodeShape: NodeShape
  nodeSize: NodeSize
  nodeTextScale: NodeTextScale
}

type CloudCanvasRecord = {
  document: CanvasDocument
  presentation: CloudPresentation
  updatedAt?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidPresentation(value: unknown): value is CloudPresentation {
  if (!isRecord(value)) return false

  return (
    ['TB', 'BT', 'LR', 'RL'].includes(String(value.flowDirection)) &&
    ['circle', 'ellipse', 'rounded-rect', 'rounded-square'].includes(String(value.nodeShape)) &&
    [80, 120, 160, 200].includes(Number(value.nodeSize)) &&
    [12, 14, 16, 20, 24, 28, 32].includes(Number(value.nodeTextScale))
  )
}

function isValidDocument(value: unknown): value is CanvasDocument {
  if (!isRecord(value) || !isRecord(value.canvas) || !isRecord(value.nodes)) return false
  const canvas = value.canvas

  if (
    typeof canvas.id !== 'string' ||
    typeof canvas.title !== 'string' ||
    typeof canvas.rootNodeId !== 'string' ||
    typeof canvas.createdAt !== 'string' ||
    typeof canvas.updatedAt !== 'string'
  ) {
    return false
  }

  return canvas.rootNodeId in value.nodes && Object.keys(value.nodes).length > 0
}

function getCanvasDocRef(uid: string, canvasId: string) {
  return doc(db, 'users', uid, 'canvases', canvasId)
}

export async function saveToCloud(input: {
  uid: string
  canvasId: string
  document: CanvasDocument
  presentation: CloudPresentation
}) {
  const ref = getCanvasDocRef(input.uid, input.canvasId)

  await setDoc(ref, {
    document: input.document,
    presentation: input.presentation,
    updatedAt: serverTimestamp(),
  })
}

export async function loadFromCloud(input: { uid: string; canvasId: string }): Promise<CloudCanvasRecord | null> {
  const ref = getCanvasDocRef(input.uid, input.canvasId)
  const snapshot = await getDoc(ref)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as DocumentData

  if (!isValidDocument(data.document) || !isValidPresentation(data.presentation)) {
    throw new Error('雲端資料格式不合法，無法載入。')
  }

  return {
    document: data.document,
    presentation: data.presentation,
    updatedAt: data.updatedAt,
  }
}

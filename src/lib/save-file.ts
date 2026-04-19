import type {
  CanvasDocument,
  FlowDirection,
  NodeShape,
  NodeSize,
  NodeTextScale,
  ThoughtNode,
} from '../types/canvas'

export type SaveFileV1 = {
  app: 'thinking-canvas'
  version: 1
  exportedAt: string
  document: CanvasDocument
  presentation: {
    flowDirection: FlowDirection
    nodeShape: NodeShape
    nodeSize: NodeSize
    nodeTextScale: NodeTextScale
  }
}

const validDirections: FlowDirection[] = ['TB', 'BT', 'LR', 'RL']
const validShapes: NodeShape[] = ['circle', 'ellipse', 'rounded-rect', 'rounded-square']
const validSizes: NodeSize[] = [80, 120, 160, 200]
const validTextScales: NodeTextScale[] = [12, 14, 16, 20, 24, 28, 32]

export function createSaveFileV1(input: {
  document: CanvasDocument
  flowDirection: FlowDirection
  nodeShape: NodeShape
  nodeSize: NodeSize
  nodeTextScale: NodeTextScale
}): SaveFileV1 {
  return {
    app: 'thinking-canvas',
    version: 1,
    exportedAt: new Date().toISOString(),
    document: input.document,
    presentation: {
      flowDirection: input.flowDirection,
      nodeShape: input.nodeShape,
      nodeSize: input.nodeSize,
      nodeTextScale: input.nodeTextScale,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateNodeRecord(document: CanvasDocument) {
  const canvasId = document.canvas.id

  for (const [key, value] of Object.entries(document.nodes)) {
    if (!isRecord(value)) {
      throw new Error(`匯入失敗，node ${key} 格式不合法。`)
    }

    const node = value as unknown as ThoughtNode

    if (node.id !== key) {
      throw new Error(`匯入失敗，node key 與 id 不一致: ${key}`)
    }

    if (node.canvasId !== canvasId) {
      throw new Error(`匯入失敗，node ${key} 的 canvasId 不一致。`)
    }

    if (!Array.isArray(node.childIds) || !Array.isArray(node.links) || !Array.isArray(node.tags)) {
      throw new Error(`匯入失敗，node ${key} 陣列欄位不合法。`)
    }

    if (!isRecord(node.position) || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      throw new Error(`匯入失敗，node ${key} position 不合法。`)
    }

    for (const childId of node.childIds) {
      if (!(childId in document.nodes)) {
        throw new Error(`匯入失敗，node ${key} 指向不存在的 childId: ${childId}`)
      }
      const child = document.nodes[childId]
      if (child.parentId !== node.id) {
        throw new Error(`匯入失敗，node ${key} 與 child ${childId} 的 parent/child 關係不一致。`)
      }
    }

    if (node.parentId !== null) {
      if (!(node.parentId in document.nodes)) {
        throw new Error(`匯入失敗，node ${key} 指向不存在的 parentId: ${node.parentId}`)
      }
      const parent = document.nodes[node.parentId]
      if (!parent.childIds.includes(node.id)) {
        throw new Error(`匯入失敗，node ${key} 與 parent ${node.parentId} 的 parent/child 關係不一致。`)
      }
    }
  }
}

export function parseSaveFileV1(raw: string): SaveFileV1 {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('匯入失敗，這不是有效的 JSON 檔案。')
  }

  if (!isRecord(parsed)) {
    throw new Error('匯入失敗，存檔格式不是有效物件。')
  }

  if (parsed.app !== 'thinking-canvas') {
    throw new Error('匯入失敗，這不是 Thinking Canvas 的存檔。')
  }

  if (parsed.version !== 1) {
    throw new Error('匯入失敗，目前只支援 save file v1。')
  }

  if (typeof parsed.exportedAt !== 'string') {
    throw new Error('匯入失敗，缺少 exportedAt。')
  }

  if (!isRecord(parsed.document) || !isRecord(parsed.presentation)) {
    throw new Error('匯入失敗，缺少 document 或 presentation。')
  }

  const document = parsed.document as unknown as CanvasDocument
  const presentation = parsed.presentation

  if (!isRecord(document.canvas) || !isRecord(document.nodes)) {
    throw new Error('匯入失敗，document 結構不完整。')
  }

  if (
    typeof document.canvas.id !== 'string' ||
    typeof document.canvas.title !== 'string' ||
    typeof document.canvas.rootNodeId !== 'string' ||
    typeof document.canvas.createdAt !== 'string' ||
    typeof document.canvas.updatedAt !== 'string'
  ) {
    throw new Error('匯入失敗，canvas 缺少必要欄位。')
  }

  if (!(document.canvas.rootNodeId in document.nodes)) {
    throw new Error('匯入失敗，rootNodeId 對應不到任何 node。')
  }

  if (!validDirections.includes(presentation.flowDirection as FlowDirection)) {
    throw new Error('匯入失敗，flowDirection 不合法。')
  }

  if (!validShapes.includes(presentation.nodeShape as NodeShape)) {
    throw new Error('匯入失敗，nodeShape 不合法。')
  }

  if (!validSizes.includes(presentation.nodeSize as NodeSize)) {
    throw new Error('匯入失敗，nodeSize 不合法。')
  }

  if (!validTextScales.includes(presentation.nodeTextScale as NodeTextScale)) {
    throw new Error('匯入失敗，nodeTextScale 不合法。')
  }

  validateNodeRecord(document)

  return parsed as SaveFileV1
}

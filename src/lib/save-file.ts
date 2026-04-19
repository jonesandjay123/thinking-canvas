import type {
  CanvasDocument,
  FlowDirection,
  NodeShape,
  NodeSize,
  NodeTextScale,
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

  const document = parsed.document
  const presentation = parsed.presentation

  if (!isRecord(document.canvas) || !isRecord(document.nodes)) {
    throw new Error('匯入失敗，document 結構不完整。')
  }

  if (typeof document.canvas.id !== 'string' || typeof document.canvas.rootNodeId !== 'string') {
    throw new Error('匯入失敗，canvas 缺少必要欄位。')
  }

  if (!(document.canvas.rootNodeId in document.nodes)) {
    throw new Error('匯入失敗，rootNodeId 對應不到任何 node。')
  }

  const validDirections: FlowDirection[] = ['TB', 'BT', 'LR', 'RL']
  const validShapes: NodeShape[] = ['circle', 'ellipse', 'rounded-rect', 'rounded-square']
  const validSizes: NodeSize[] = [80, 120, 160, 200]
  const validTextScales: NodeTextScale[] = [12, 14, 16, 20, 24, 28, 32]

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

  for (const [key, value] of Object.entries(document.nodes)) {
    if (!isRecord(value)) {
      throw new Error(`匯入失敗，node ${key} 格式不合法。`)
    }
    if (value.id !== key) {
      throw new Error(`匯入失敗，node key 與 id 不一致: ${key}`)
    }
  }

  return parsed as SaveFileV1
}

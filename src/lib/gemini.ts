import type { CanvasDocument, ThoughtNode } from '../types/canvas'

const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'
const endpoint = 'https://us-central1-thinking-canvas.cloudfunctions.net/generateNodeIdeas'

type GenerateNodeIdeasRequest = {
  title: string
  content: string
  path: string[]
  existingChildren: string[]
  treeContext: string
  count: number
  model: string
}

type GenerateNodeIdeasResponse = {
  suggestions?: unknown
  model?: string
  error?: string
}

function buildTreeContext(document: CanvasDocument): string {
  const walk = (nodeId: string, depth = 0): string => {
    const node = document.nodes[nodeId]
    if (!node) return ''
    const indent = '  '.repeat(depth)
    const lines = [`${indent}- ${node.title}${node.content ? `: ${node.content}` : ''}`]
    node.childIds.forEach((childId) => {
      lines.push(walk(childId, depth + 1))
    })
    return lines.filter(Boolean).join('\n')
  }

  return walk(document.canvas.rootNodeId)
}

function buildNodePath(document: CanvasDocument, node: ThoughtNode): string[] {
  const path: string[] = []
  let current: ThoughtNode | undefined = node

  while (current) {
    path.unshift(current.title)
    current = current.parentId ? document.nodes[current.parentId] : undefined
  }

  return path
}

function normalizeError(message: string): Error {
  return new Error(message || 'AI 呼叫失敗。')
}

export function geminiReady(): boolean {
  return true
}

export async function generateChildSuggestions(
  document: CanvasDocument,
  node: ThoughtNode,
  count = 3,
): Promise<string[]> {
  const payload: GenerateNodeIdeasRequest = {
    title: node.title,
    content: node.content || '',
    path: buildNodePath(document, node),
    existingChildren: node.childIds
      .map((childId) => document.nodes[childId]?.title)
      .filter((title): title is string => Boolean(title)),
    treeContext: buildTreeContext(document),
    count,
    model,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as GenerateNodeIdeasResponse

  if (!response.ok) {
    throw normalizeError(data.error || 'AI 呼叫失敗。')
  }

  const suggestions = data.suggestions
  if (!Array.isArray(suggestions)) {
    throw new Error('AI 回傳格式不正確。')
  }

  const normalized = suggestions
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, count)

  if (!normalized.length) {
    throw new Error('AI 沒有產出可用建議，請再試一次。')
  }

  return normalized
}

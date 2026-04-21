import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'
import type { CanvasDocument, ThoughtNode } from '../types/canvas'

const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

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
}

const generateNodeIdeasCallable = httpsCallable<GenerateNodeIdeasRequest, GenerateNodeIdeasResponse>(functions, 'generateNodeIdeas')

function normalizeHttpsCallableError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return new Error((error as { message: string }).message)
  }

  return new Error('AI 呼叫失敗。')
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

export function geminiReady(): boolean {
  return true
}

export async function generateChildSuggestions(
  document: CanvasDocument,
  node: ThoughtNode,
  count = 3,
): Promise<string[]> {
  try {
    const result = await generateNodeIdeasCallable({
      title: node.title,
      content: node.content || '',
      path: buildNodePath(document, node),
      existingChildren: node.childIds
        .map((childId) => document.nodes[childId]?.title)
        .filter((title): title is string => Boolean(title)),
      treeContext: buildTreeContext(document),
      count,
      model,
    })

    const suggestions = result.data?.suggestions
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
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[generateNodeIdeas callable failed]', error)
    }
    throw normalizeHttpsCallableError(error)
  }
}

import { GoogleGenAI } from '@google/genai'
import type { CanvasDocument, ThoughtNode } from '../types/canvas'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY
const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

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
  return Boolean(ai)
}

export async function generateChildSuggestions(
  document: CanvasDocument,
  node: ThoughtNode,
  count = 3,
): Promise<string[]> {
  if (!ai) {
    throw new Error('Gemini API key 尚未設定，請先建立 .env.local 並填入 VITE_GEMINI_API_KEY。')
  }

  const treeContext = buildTreeContext(document)
  const existingChildren = node.childIds
    .map((childId) => document.nodes[childId]?.title)
    .filter(Boolean)
    .join('、')
  const nodePath = buildNodePath(document, node).join(' → ')

  const prompt = `你是一個協助發散思考的助手。

目前整張思考畫布如下：
${treeContext}

現在要展開的節點是：${node.title}
節點補充內容：${node.content || '（無）'}
從 root 到目前節點的路徑：${nodePath}
目前已存在的子節點：${existingChildren || '（無）'}

請根據整體脈絡，為這個節點提供 ${count} 個適合新增的子節點標題。
要求：
1. 使用繁體中文
2. 不要和現有子節點重複
3. 每個建議都要簡潔，適合直接當成節點標題
4. 回傳純 JSON array，例如：["方向一", "方向二"]
5. 不要回傳任何額外說明文字。`

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  })

  const rawText = response.text ?? ''
  const jsonMatch = rawText.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Gemini 回傳格式無法解析。')
  }

  const parsed = JSON.parse(jsonMatch[0])
  if (!Array.isArray(parsed)) {
    throw new Error('Gemini 回傳不是陣列格式。')
  }

  return parsed.filter((item): item is string => typeof item === 'string').slice(0, count)
}

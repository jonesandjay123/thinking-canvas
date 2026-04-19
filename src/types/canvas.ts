export type ThoughtNodeType = 'root' | 'idea' | 'project' | 'principle' | 'note'

export interface Canvas {
  id: string
  title: string
  rootNodeId: string
  createdAt: string
  updatedAt: string
}

export interface ThoughtNode {
  id: string
  canvasId: string
  title: string
  content: string
  childIds: string[]
  parentId: string | null
  links: string[]
  tags: string[]
  type: ThoughtNodeType
  position: {
    x: number
    y: number
  }
  isExpanded?: boolean
  createdAt: string
  updatedAt: string
}

export interface CanvasDocument {
  canvas: Canvas
  nodes: Record<string, ThoughtNode>
}

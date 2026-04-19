import { useMemo, useRef } from 'react'
import type { ThoughtNode } from '../types/canvas'
import { NodeCard } from './NodeCard'

interface CanvasViewProps {
  nodes: ThoughtNode[]
  rootNodeId: string
  generatingNodeId: string | null
  geminiEnabled: boolean
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  onGenerate: (id: string) => void
  onChange: (id: string, patch: Partial<ThoughtNode>) => void
  onMove: (id: string, position: ThoughtNode['position']) => void
}

export function CanvasView({
  nodes,
  rootNodeId,
  generatingNodeId,
  geminiEnabled,
  onAddChild,
  onDelete,
  onGenerate,
  onChange,
  onMove,
}: CanvasViewProps) {
  const dragState = useRef<{
    nodeId: string
    pointerOffsetX: number
    pointerOffsetY: number
  } | null>(null)

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes])

  const edges = useMemo(
    () =>
      nodes
        .filter((node) => node.parentId)
        .map((node) => {
          const parent = node.parentId ? nodeMap[node.parentId] : null
          if (!parent) return null

          const fromX = parent.position.x + 90
          const fromY = parent.position.y + (parent.isExpanded ? 168 : 90)
          const toX = node.position.x + 90
          const toY = node.position.y
          const controlY = (fromY + toY) / 2

          return {
            id: `${parent.id}-${node.id}`,
            path: `M ${fromX} ${fromY} C ${fromX} ${controlY}, ${toX} ${controlY}, ${toX} ${toY}`,
          }
        })
        .filter(Boolean),
    [nodeMap, nodes],
  )

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return

    const canvasRect = event.currentTarget.getBoundingClientRect()
    const nextX = event.clientX - canvasRect.left - canvasRect.width / 2 - dragState.current.pointerOffsetX
    const nextY = event.clientY - canvasRect.top - 90 - dragState.current.pointerOffsetY

    onMove(dragState.current.nodeId, {
      x: Math.round(nextX),
      y: Math.round(nextY),
    })
  }

  const stopDrag = () => {
    dragState.current = null
  }

  const startDrag = (nodeId: string, event: React.PointerEvent<HTMLDivElement>) => {
    const currentNode = nodes.find((node) => node.id === nodeId)
    if (!currentNode) return

    const rect = event.currentTarget.getBoundingClientRect()
    dragState.current = {
      nodeId,
      pointerOffsetX: event.clientX - rect.left - rect.width / 2,
      pointerOffsetY: event.clientY - rect.top - currentNode.position.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  return (
    <div className="canvas-view">
      <div
        className="canvas-grid"
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      >
        <svg className="canvas-edges" aria-hidden="true">
          {edges.map((edge) =>
            edge ? <path key={edge.id} d={edge.path} /> : null,
          )}
        </svg>

        {nodes.map((node) => (
          <div
            key={node.id}
            className="canvas-node"
            style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
          >
            <NodeCard
              node={node}
              isRoot={node.id === rootNodeId}
              isGenerating={generatingNodeId === node.id}
              geminiEnabled={geminiEnabled}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onGenerate={onGenerate}
              onChange={onChange}
              onDragStart={startDrag}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

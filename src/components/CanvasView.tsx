import { useRef } from 'react'
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
    offsetX: number
    offsetY: number
  } | null>(null)

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return

    const canvasRect = event.currentTarget.getBoundingClientRect()
    const nextX = event.clientX - canvasRect.left - canvasRect.width / 2 - dragState.current.offsetX
    const nextY = event.clientY - canvasRect.top - 90 - dragState.current.offsetY

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

    dragState.current = {
      nodeId,
      offsetX: event.clientX - event.currentTarget.getBoundingClientRect().left - event.currentTarget.clientWidth / 2,
      offsetY: event.clientY - event.currentTarget.getBoundingClientRect().top,
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

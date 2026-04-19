import { useMemo, useRef, useState } from 'react'
import type { ControlDock, ThemeMode, ThoughtNode } from '../types/canvas'
import { NodeCard } from './NodeCard'

interface CanvasViewProps {
  nodes: ThoughtNode[]
  rootNodeId: string
  generatingNodeId: string | null
  geminiEnabled: boolean
  controlDock: ControlDock
  theme: ThemeMode
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  onGenerate: (id: string) => void
  onChange: (id: string, patch: Partial<ThoughtNode>) => void
  onMove: (id: string, position: ThoughtNode['position']) => void
}

const BUBBLE_SIZE = 180
const HALF_BUBBLE = BUBBLE_SIZE / 2

export function CanvasView({
  nodes,
  rootNodeId,
  generatingNodeId,
  geminiEnabled,
  controlDock,
  theme,
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
  const [zoom, setZoom] = useState(1)

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map((node) => [node.id, node])), [nodes])

  const edges = useMemo(
    () =>
      nodes
        .filter((node) => node.parentId)
        .map((node) => {
          const parent = node.parentId ? nodeMap[node.parentId] : null
          if (!parent) return null

          const fromX = parent.position.x + HALF_BUBBLE
          const fromY = parent.position.y + HALF_BUBBLE
          const toX = node.position.x + HALF_BUBBLE
          const toY = node.position.y + HALF_BUBBLE
          const deltaY = Math.max(60, Math.abs(toY - fromY) * 0.45)

          return {
            id: `${parent.id}-${node.id}`,
            path: `M ${fromX} ${fromY} C ${fromX} ${fromY + deltaY}, ${toX} ${toY - deltaY}, ${toX} ${toY}`,
          }
        })
        .filter(Boolean),
    [nodeMap, nodes],
  )

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return

    const canvasRect = event.currentTarget.getBoundingClientRect()
    const nextX = (event.clientX - canvasRect.left) / zoom - dragState.current.pointerOffsetX
    const nextY = (event.clientY - canvasRect.top) / zoom - dragState.current.pointerOffsetY

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
      pointerOffsetX: (event.clientX - rect.left) / zoom,
      pointerOffsetY: (event.clientY - rect.top) / zoom,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const zoomIn = () => setZoom((current) => Math.min(1.8, Number((current + 0.1).toFixed(2))))
  const zoomOut = () => setZoom((current) => Math.max(0.6, Number((current - 0.1).toFixed(2))))
  const resetZoom = () => setZoom(1)

  return (
    <div className={`canvas-view theme-${theme}`}>
      <div className="canvas-toolbar">
        <button className="secondary" onClick={zoomOut}>
          −
        </button>
        <button className="secondary" onClick={resetZoom}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="secondary" onClick={zoomIn}>
          +
        </button>
      </div>

      <div
        className="canvas-grid"
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
      >
        <div className="canvas-stage" style={{ transform: `scale(${zoom})` }}>
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
                controlDock={controlDock}
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
    </div>
  )
}

import type { ThoughtNode } from '../types/canvas'
import { NodeCard } from './NodeCard'

interface CanvasViewProps {
  nodes: ThoughtNode[]
  rootNodeId: string
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  onChange: (id: string, patch: Partial<ThoughtNode>) => void
}

export function CanvasView({ nodes, rootNodeId, onAddChild, onDelete, onChange }: CanvasViewProps) {
  return (
    <div className="canvas-view">
      <div className="canvas-grid">
        {nodes.map((node) => (
          <div
            key={node.id}
            className="canvas-node"
            style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)` }}
          >
            <NodeCard
              node={node}
              isRoot={node.id === rootNodeId}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onChange={onChange}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

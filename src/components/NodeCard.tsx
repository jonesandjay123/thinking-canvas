import type { ThoughtNode } from '../types/canvas'

interface NodeCardProps {
  node: ThoughtNode
  isRoot?: boolean
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  onChange: (id: string, patch: Partial<ThoughtNode>) => void
}

export function NodeCard({ node, isRoot = false, onAddChild, onDelete, onChange }: NodeCardProps) {
  return (
    <div className={`node-card ${isRoot ? 'root' : ''}`}>
      <div className="node-card__meta">
        <span className="node-badge">{node.type}</span>
        <span className="node-tagline">#{node.id}</span>
      </div>

      <input
        className="node-card__title"
        value={node.title}
        onChange={(event) => onChange(node.id, { title: event.target.value })}
      />

      <textarea
        className="node-card__content"
        value={node.content}
        placeholder="Write the thought here..."
        onChange={(event) => onChange(node.id, { content: event.target.value })}
      />

      <div className="node-card__footer">
        <button onClick={() => onAddChild(node.id)}>+ Add child</button>
        {!isRoot && (
          <button className="danger" onClick={() => onDelete(node.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

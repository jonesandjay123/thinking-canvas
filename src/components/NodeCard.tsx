import type { ThoughtNode } from '../types/canvas'

interface NodeCardProps {
  node: ThoughtNode
  isRoot?: boolean
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  onChange: (id: string, patch: Partial<ThoughtNode>) => void
}

const typeLabelMap: Record<ThoughtNode['type'], string> = {
  root: '根節點',
  idea: '想法',
  project: '專案',
  principle: '原則',
  note: '筆記',
}

export function NodeCard({ node, isRoot = false, onAddChild, onDelete, onChange }: NodeCardProps) {
  return (
    <div className={`node-card ${isRoot ? 'root' : ''}`}>
      <div className="node-card__meta">
        <span className="node-badge">{typeLabelMap[node.type]}</span>
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
        placeholder="在這裡寫下這個節點的內容..."
        onChange={(event) => onChange(node.id, { content: event.target.value })}
      />

      <div className="node-card__footer">
        <button onClick={() => onAddChild(node.id)}>+ 新增子節點</button>
        {!isRoot && (
          <button className="danger" onClick={() => onDelete(node.id)}>
            刪除
          </button>
        )}
      </div>
    </div>
  )
}

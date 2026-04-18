import type { ThoughtNode } from '../types/canvas'

interface NodeCardProps {
  node: ThoughtNode
  isRoot?: boolean
  isGenerating?: boolean
  geminiEnabled?: boolean
  onAddChild: (id: string) => void
  onDelete: (id: string) => void
  onGenerate: (id: string) => void
  onChange: (id: string, patch: Partial<ThoughtNode>) => void
  onDragStart: (id: string, event: React.PointerEvent<HTMLDivElement>) => void
}

const typeLabelMap: Record<ThoughtNode['type'], string> = {
  root: '根節點',
  idea: '想法',
  project: '專案',
  principle: '原則',
  note: '筆記',
}

export function NodeCard({
  node,
  isRoot = false,
  isGenerating = false,
  geminiEnabled = false,
  onAddChild,
  onDelete,
  onGenerate,
  onChange,
  onDragStart,
}: NodeCardProps) {
  return (
    <div className={`node-card ${isRoot ? 'root' : ''}`} onPointerDown={(event) => onDragStart(node.id, event)}>
      <div className="node-card__meta">
        <span className="node-badge">{typeLabelMap[node.type]}</span>
        <span className="node-tagline">#{node.id}</span>
      </div>

      <input
        className="node-card__title"
        value={node.title}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange(node.id, { title: event.target.value })}
      />

      <textarea
        className="node-card__content"
        value={node.content}
        placeholder="在這裡寫下這個節點的內容..."
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => onChange(node.id, { content: event.target.value })}
      />

      <div className="node-card__footer node-card__footer--stacked">
        <button onClick={() => onAddChild(node.id)}>+ 新增子節點</button>
        <button
          className="secondary"
          onClick={() => onGenerate(node.id)}
          disabled={!geminiEnabled || isGenerating}
          title={geminiEnabled ? '使用 Gemini 產生子節點建議' : '請先設定 VITE_GEMINI_API_KEY'}
        >
          {isGenerating ? 'Gemini 產生中...' : '✨ Gemini 展開'}
        </button>
        {!isRoot && (
          <button className="danger" onClick={() => onDelete(node.id)}>
            刪除
          </button>
        )}
      </div>
    </div>
  )
}

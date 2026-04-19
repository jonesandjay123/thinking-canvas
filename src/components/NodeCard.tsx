import type { ControlDock, ThoughtNode } from '../types/canvas'

interface NodeCardProps {
  node: ThoughtNode
  controlDock: ControlDock
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
  controlDock,
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
    <div
      className={`node-card ${isRoot ? 'root' : ''} ${node.isExpanded ? 'expanded' : 'compact'}`}
      onDoubleClick={() => onChange(node.id, { isExpanded: !node.isExpanded })}
    >
      <div className="node-card__bubble" onPointerDown={(event) => onDragStart(node.id, event)}>
        <span className="node-card__title-text">{node.title}</span>
        <div
          className={`node-card__hover-actions node-card__hover-actions--${controlDock}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button className="icon-button" onClick={() => onAddChild(node.id)} title="新增子節點">
            +
          </button>
          <button
            className="icon-button secondary"
            onClick={() => onGenerate(node.id)}
            disabled={!geminiEnabled || isGenerating}
            title={geminiEnabled ? '使用 Gemini 產生子節點建議' : '請先設定 VITE_GEMINI_API_KEY'}
          >
            {isGenerating ? '…' : '✨'}
          </button>
          {!isRoot && (
            <button className="icon-button danger" onClick={() => onDelete(node.id)} title="刪除節點">
              ×
            </button>
          )}
        </div>
      </div>

      {node.isExpanded && (
        <div className="node-card__details" onPointerDown={(event) => event.stopPropagation()}>
          <div className="node-card__meta">
            <span className="node-badge">{typeLabelMap[node.type]}</span>
            <button className="text-button" onClick={() => onChange(node.id, { isExpanded: false })}>
              收合
            </button>
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
        </div>
      )}
    </div>
  )
}

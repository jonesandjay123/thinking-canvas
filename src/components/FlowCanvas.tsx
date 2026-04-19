import { useCallback, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodePositionChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { generateChildSuggestions } from '../lib/gemini'
import type { CanvasDocument, ControlDock, ThemeMode, ThoughtNode } from '../types/canvas'

type FlowNodeData = {
  thoughtNode: ThoughtNode
  controlDock: ControlDock
  theme: ThemeMode
  geminiEnabled: boolean
  isGenerating: boolean
  onAddChild: (id: string) => void
  onGenerate: (id: string) => void
  onDelete: (id: string) => void
  onToggleExpand: (id: string) => void
  onUpdate: (id: string, patch: Partial<ThoughtNode>) => void
}

interface FlowCanvasProps {
  document: CanvasDocument
  aiExpandCount: number
  controlDock: ControlDock
  theme: ThemeMode
  geminiEnabled: boolean
  onDocumentChange: (document: CanvasDocument) => void
  onStatus: (message: string, tone: 'neutral' | 'success' | 'error') => void
}

function FlowThoughtNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const { thoughtNode, controlDock, theme, geminiEnabled, isGenerating } = data

  return (
    <div className={`flow-node theme-${theme} ${thoughtNode.isExpanded ? 'expanded' : 'compact'}`}>
      <Handle type="target" position={Position.Top} className="flow-node__handle" />
      <Handle type="source" position={Position.Bottom} className="flow-node__handle" />

      <div className="flow-node__bubble" onDoubleClick={() => data.onToggleExpand(thoughtNode.id)}>
        <span className="flow-node__title">{thoughtNode.title}</span>
        <div className={`flow-node__actions flow-node__actions--${controlDock}`}>
          <button className="icon-button nodrag nopan" onClick={() => data.onAddChild(thoughtNode.id)} title="新增子節點">
            +
          </button>
          <button
            className="icon-button secondary nodrag nopan"
            onClick={() => data.onGenerate(thoughtNode.id)}
            disabled={!geminiEnabled || isGenerating}
            title={geminiEnabled ? '使用 Gemini 產生子節點建議' : '請先設定 VITE_GEMINI_API_KEY'}
          >
            {isGenerating ? '…' : '✨'}
          </button>
          {thoughtNode.parentId && (
            <button className="icon-button danger nodrag nopan" onClick={() => data.onDelete(thoughtNode.id)} title="刪除節點">
              ×
            </button>
          )}
        </div>
      </div>

      {thoughtNode.isExpanded && (
        <div className="flow-node__details nodrag nopan">
          <div className="flow-node__meta">
            <span className="node-badge">{thoughtNode.type}</span>
            <button className="text-button" onClick={() => data.onToggleExpand(thoughtNode.id)}>
              收合
            </button>
          </div>
          <input
            className="flow-node__input"
            value={thoughtNode.title}
            onChange={(event) => data.onUpdate(thoughtNode.id, { title: event.target.value })}
          />
          <textarea
            className="flow-node__textarea"
            value={thoughtNode.content}
            placeholder="在這裡寫下這個節點的內容..."
            onChange={(event) => data.onUpdate(thoughtNode.id, { content: event.target.value })}
          />
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  thought: FlowThoughtNode,
}

function buildFlowEdges(document: CanvasDocument): Edge[] {
  return Object.values(document.nodes)
    .filter((node) => node.parentId)
    .map((node) => ({
      id: `${node.parentId}-${node.id}`,
      source: node.parentId as string,
      target: node.id,
      type: 'smoothstep',
      sourceHandle: null,
      targetHandle: null,
    }))
}

function FlowCanvasInner({
  document,
  aiExpandCount,
  controlDock,
  theme,
  geminiEnabled,
  onDocumentChange,
  onStatus,
}: FlowCanvasProps) {
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null)

  const persistNodes = useCallback(
    (nextNodes: Record<string, ThoughtNode>) => {
      onDocumentChange({
        ...document,
        canvas: { ...document.canvas, updatedAt: new Date().toISOString() },
        nodes: nextNodes,
      })
    },
    [document, onDocumentChange],
  )

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parent = document.nodes[parentId]
      if (!parent) return

      const id = Math.random().toString(36).slice(2, 10)
      const childIndex = parent.childIds.length
      const timestamp = new Date().toISOString()
      const newNode: ThoughtNode = {
        id,
        canvasId: document.canvas.id,
        title: '新節點',
        content: '',
        childIds: [],
        parentId,
        links: [],
        tags: [],
        type: 'idea',
        position: {
          x: parent.position.x + (childIndex - Math.floor(parent.childIds.length / 2)) * 240,
          y: parent.position.y + 220,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      persistNodes({
        ...document.nodes,
        [parentId]: {
          ...parent,
          childIds: [...parent.childIds, id],
          updatedAt: timestamp,
        },
        [id]: newNode,
      })
    },
    [document, persistNodes],
  )

  const handleDelete = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId]
      if (!node || !node.parentId) return

      const nextNodes = { ...document.nodes }
      const removeRecursively = (targetId: string) => {
        const target = nextNodes[targetId]
        if (!target) return
        target.childIds.forEach(removeRecursively)
        delete nextNodes[targetId]
      }
      removeRecursively(nodeId)

      nextNodes[node.parentId] = {
        ...nextNodes[node.parentId],
        childIds: nextNodes[node.parentId].childIds.filter((childId) => childId !== nodeId),
        updatedAt: new Date().toISOString(),
      }

      persistNodes(nextNodes)
    },
    [document, persistNodes],
  )

  const handleToggleExpand = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId]
      if (!node) return
      persistNodes({
        ...document.nodes,
        [nodeId]: {
          ...node,
          isExpanded: !node.isExpanded,
          updatedAt: new Date().toISOString(),
        },
      })
    },
    [document, persistNodes],
  )

  const handleUpdate = useCallback(
    (nodeId: string, patch: Partial<ThoughtNode>) => {
      const node = document.nodes[nodeId]
      if (!node) return
      persistNodes({
        ...document.nodes,
        [nodeId]: {
          ...node,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      })
    },
    [document, persistNodes],
  )

  const handleGenerate = useCallback(
    async (nodeId: string) => {
      const node = document.nodes[nodeId]
      if (!node) return

      setGeneratingNodeId(nodeId)
      onStatus('', 'neutral')
      try {
        const suggestions = await generateChildSuggestions(document, node, aiExpandCount)
        if (!suggestions.length) {
          onStatus('Gemini 沒有產出可用建議，請再試一次。', 'error')
          return
        }

        let nextDocument = document
        suggestions.forEach((title) => {
          const parent = nextDocument.nodes[nodeId]
          const id = Math.random().toString(36).slice(2, 10)
          const childIndex = parent.childIds.length
          const timestamp = new Date().toISOString()
          const newNode: ThoughtNode = {
            id,
            canvasId: nextDocument.canvas.id,
            title,
            content: '',
            childIds: [],
            parentId: nodeId,
            links: [],
            tags: [],
            type: 'idea',
            position: {
              x: parent.position.x + (childIndex - Math.floor((parent.childIds.length + suggestions.length) / 2)) * 240,
              y: parent.position.y + 220,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          }

          nextDocument = {
            ...nextDocument,
            canvas: { ...nextDocument.canvas, updatedAt: timestamp },
            nodes: {
              ...nextDocument.nodes,
              [nodeId]: {
                ...parent,
                childIds: [...parent.childIds, id],
                updatedAt: timestamp,
              },
              [id]: newNode,
            },
          }
        })

        onDocumentChange(nextDocument)
        onStatus(`Gemini 已為「${node.title}」新增 ${suggestions.length} 個子節點。`, 'success')
      } catch (error) {
        onStatus(error instanceof Error ? error.message : 'Gemini 展開失敗。', 'error')
      } finally {
        setGeneratingNodeId(null)
      }
    },
    [aiExpandCount, document, onDocumentChange, onStatus],
  )

  const nodes = useMemo<Node[]>(
    () =>
      Object.values(document.nodes).map((node) => ({
        id: node.id,
        type: 'thought',
        position: node.position,
        data: {
          thoughtNode: node,
          controlDock,
          theme,
          geminiEnabled,
          isGenerating: generatingNodeId === node.id,
          onAddChild: handleAddChild,
          onGenerate: handleGenerate,
          onDelete: handleDelete,
          onToggleExpand: handleToggleExpand,
          onUpdate: handleUpdate,
        },
      })),
    [controlDock, document.nodes, geminiEnabled, generatingNodeId, handleAddChild, handleDelete, handleGenerate, handleToggleExpand, handleUpdate, theme],
  )

  const edges = useMemo(() => buildFlowEdges(document), [document])

  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      const nextNodes = { ...document.nodes }
      let changed = false

      changes.forEach((change) => {
        if (change.type !== 'position' || !('position' in change) || !change.position || change.dragging) return
        const positionChange = change as NodePositionChange
        const node = nextNodes[positionChange.id]
        if (!node) return
        const nextPosition = positionChange.position
        if (!nextPosition) return

        nextNodes[positionChange.id] = {
          ...node,
          position: {
            x: nextPosition.x,
            y: nextPosition.y,
          },
          updatedAt: new Date().toISOString(),
        }
        changed = true
      })

      if (changed) persistNodes(nextNodes)
    },
    [document.nodes, persistNodes],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      const child = document.nodes[connection.target]
      const parent = document.nodes[connection.source]
      if (!child || !parent || child.parentId === connection.source) return

      const timestamp = new Date().toISOString()
      const previousParentId = child.parentId
      const nextNodes = { ...document.nodes }

      if (previousParentId && nextNodes[previousParentId]) {
        nextNodes[previousParentId] = {
          ...nextNodes[previousParentId],
          childIds: nextNodes[previousParentId].childIds.filter((id) => id !== child.id),
          updatedAt: timestamp,
        }
      }

      nextNodes[connection.source] = {
        ...parent,
        childIds: [...parent.childIds, child.id],
        updatedAt: timestamp,
      }

      nextNodes[child.id] = {
        ...child,
        parentId: connection.source,
        updatedAt: timestamp,
      }

      persistNodes(nextNodes)
      onStatus('已更新節點連線關係。', 'success')
    },
    [document.nodes, onStatus, persistNodes],
  )

  return (
    <div className={`flow-shell theme-${theme}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.4}
        maxZoom={1.8}
        colorMode={theme}
        nodesDraggable
        elevateEdgesOnSelect
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
        <Controls showInteractive={false} />
        <Panel position="top-right" className="flow-hint-panel">
          雙擊節點可展開細節，拖曳、縮放、edges 交給 React Flow。
        </Panel>
      </ReactFlow>
    </div>
  )
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

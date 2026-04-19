import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { generateChildSuggestions } from '../lib/gemini'
import type { CanvasDocument, ControlDock, FlowDirection, NodeTextScale, ThemeMode, ThoughtNode } from '../types/canvas'

type FlowNodeData = {
  thoughtNode: ThoughtNode
  controlDock: ControlDock
  sourcePosition: Position
  targetPosition: Position
  textScale: NodeTextScale
  theme: ThemeMode
  geminiEnabled: boolean
  isGenerating: boolean
  onAddChild: (id: string) => void
  onGenerate: (id: string) => void
  onDelete: (id: string) => void
  onToggleExpand: (id: string) => void
  onCommit: (id: string, patch: Partial<ThoughtNode>) => void
}

interface FlowCanvasProps {
  document: CanvasDocument
  aiExpandCount: number
  controlDock: ControlDock
  flowDirection: FlowDirection
  nodeTextScale: NodeTextScale
  theme: ThemeMode
  geminiEnabled: boolean
  onDocumentChange: (document: CanvasDocument) => void
  onStatus: (message: string, tone: 'neutral' | 'success' | 'error') => void
}

function getFlowAxis(direction: FlowDirection) {
  switch (direction) {
    case 'LR':
      return { source: Position.Right, target: Position.Left, x: 260, y: 0 }
    case 'RL':
      return { source: Position.Left, target: Position.Right, x: -260, y: 0 }
    case 'BT':
      return { source: Position.Top, target: Position.Bottom, x: 0, y: -220 }
    case 'TB':
    default:
      return { source: Position.Bottom, target: Position.Top, x: 0, y: 220 }
  }
}

function layoutDocument(document: CanvasDocument, direction: FlowDirection): CanvasDocument {
  const axis = getFlowAxis(direction)
  const nextNodes = { ...document.nodes }
  const levelMap = new Map<string, number>()

  const walk = (nodeId: string, depth: number) => {
    levelMap.set(nodeId, depth)
    nextNodes[nodeId]?.childIds.forEach((childId) => walk(childId, depth + 1))
  }

  walk(document.canvas.rootNodeId, 0)

  const grouped = new Map<number, string[]>()
  Array.from(levelMap.entries()).forEach(([nodeId, depth]) => {
    const existing = grouped.get(depth) ?? []
    existing.push(nodeId)
    grouped.set(depth, existing)
  })

  grouped.forEach((nodeIds, depth) => {
    nodeIds.forEach((nodeId, index) => {
      const offset = index - (nodeIds.length - 1) / 2
      const node = nextNodes[nodeId]
      if (!node) return

      if (direction === 'TB' || direction === 'BT') {
        nextNodes[nodeId] = {
          ...node,
          position: {
            x: offset * 260,
            y: depth * axis.y,
          },
        }
      } else {
        nextNodes[nodeId] = {
          ...node,
          position: {
            x: depth * axis.x,
            y: offset * 220,
          },
        }
      }
    })
  })

  return {
    ...document,
    nodes: nextNodes,
  }
}

function FlowThoughtNode({ data }: NodeProps<Node<FlowNodeData>>) {
  const { thoughtNode, controlDock, sourcePosition, targetPosition, textScale, theme, geminiEnabled, isGenerating } = data
  const [draftTitle, setDraftTitle] = useState(thoughtNode.title)
  const [draftContent, setDraftContent] = useState(thoughtNode.content)

  useEffect(() => {
    setDraftTitle(thoughtNode.title)
  }, [thoughtNode.title])

  useEffect(() => {
    setDraftContent(thoughtNode.content)
  }, [thoughtNode.content])

  const commitDrafts = () => {
    const patch: Partial<ThoughtNode> = {}
    if (draftTitle !== thoughtNode.title) patch.title = draftTitle
    if (draftContent !== thoughtNode.content) patch.content = draftContent
    if (Object.keys(patch).length > 0) {
      data.onCommit(thoughtNode.id, patch)
    }
  }

  return (
    <div className={`flow-node theme-${theme} ${thoughtNode.isExpanded ? 'expanded' : 'compact'}`}>
      <Handle type="target" position={targetPosition} className="flow-node__handle" />
      <Handle type="source" position={sourcePosition} className="flow-node__handle" />

      <div className="flow-node__bubble" onDoubleClick={() => data.onToggleExpand(thoughtNode.id)}>
        <span className="flow-node__title" style={{ fontSize: `${textScale}px` }}>{thoughtNode.title}</span>
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
          <button className="collapse-chip" onClick={() => data.onToggleExpand(thoughtNode.id)} title="收合節點">
            ⌃
          </button>
          <div className="flow-node__meta">
            <span className="node-badge">{thoughtNode.type}</span>
          </div>
          <input
            className="flow-node__input"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitDrafts}
          />
          <textarea
            className="flow-node__textarea"
            value={draftContent}
            placeholder="在這裡寫下這個節點的內容..."
            onChange={(event) => setDraftContent(event.target.value)}
            onBlur={commitDrafts}
          />
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  thought: FlowThoughtNode,
}

function buildFlowEdges(document: CanvasDocument, direction: FlowDirection): Edge[] {
  const axis = getFlowAxis(direction)
  return Object.values(document.nodes)
    .filter((node) => node.parentId)
    .map((node) => ({
      id: `${node.parentId}-${node.id}`,
      source: node.parentId as string,
      target: node.id,
      type: 'smoothstep',
      sourceHandle: null,
      targetHandle: null,
      sourcePosition: axis.source,
      targetPosition: axis.target,
    }))
}

function FlowCanvasInner({
  document,
  aiExpandCount,
  controlDock,
  flowDirection,
  nodeTextScale,
  theme,
  geminiEnabled,
  onDocumentChange,
  onStatus,
}: FlowCanvasProps) {
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null)
  const lastFlowDirectionRef = useRef<FlowDirection>(flowDirection)

  const axis = useMemo(() => getFlowAxis(flowDirection), [flowDirection])

  const persistDocument = useCallback(
    (nextDocument: CanvasDocument) => {
      onDocumentChange({
        ...nextDocument,
        canvas: { ...nextDocument.canvas, updatedAt: new Date().toISOString() },
      })
    },
    [onDocumentChange],
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
          x: parent.position.x + axis.x * Math.max(1, childIndex + 1),
          y: parent.position.y + axis.y * Math.max(1, childIndex + 1),
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      persistDocument({
        ...document,
        nodes: {
          ...document.nodes,
          [parentId]: {
            ...parent,
            childIds: [...parent.childIds, id],
            updatedAt: timestamp,
          },
          [id]: newNode,
        },
      })
    },
    [axis.x, axis.y, document, persistDocument],
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

      persistDocument({ ...document, nodes: nextNodes })
    },
    [document, persistDocument],
  )

  const handleToggleExpand = useCallback(
    (nodeId: string) => {
      const node = document.nodes[nodeId]
      if (!node) return
      persistDocument({
        ...document,
        nodes: {
          ...document.nodes,
          [nodeId]: {
            ...node,
            isExpanded: !node.isExpanded,
            updatedAt: new Date().toISOString(),
          },
        },
      })
    },
    [document, persistDocument],
  )

  const handleCommit = useCallback(
    (nodeId: string, patch: Partial<ThoughtNode>) => {
      const node = document.nodes[nodeId]
      if (!node) return
      persistDocument({
        ...document,
        nodes: {
          ...document.nodes,
          [nodeId]: {
            ...node,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      })
    },
    [document, persistDocument],
  )

  const buildEdges = useCallback(
    (sourceDocument: CanvasDocument) => buildFlowEdges(sourceDocument, flowDirection),
    [flowDirection],
  )

  useEffect(() => {
    if (lastFlowDirectionRef.current === flowDirection) return
    lastFlowDirectionRef.current = flowDirection

    const relaid = layoutDocument(document, flowDirection)
    if (JSON.stringify(relaid.nodes) !== JSON.stringify(document.nodes)) {
      persistDocument(relaid)
    }
  }, [document, flowDirection, persistDocument])

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
        suggestions.forEach((title, index) => {
          const parent = nextDocument.nodes[nodeId]
          const id = Math.random().toString(36).slice(2, 10)
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
              x: parent.position.x + axis.x + (flowDirection === 'TB' || flowDirection === 'BT' ? (index - (suggestions.length - 1) / 2) * 220 : 0),
              y: parent.position.y + axis.y + (flowDirection === 'LR' || flowDirection === 'RL' ? (index - (suggestions.length - 1) / 2) * 180 : 0),
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

        persistDocument(nextDocument)
        onStatus(`Gemini 已為「${node.title}」新增 ${suggestions.length} 個子節點。`, 'success')
      } catch (error) {
        onStatus(error instanceof Error ? error.message : 'Gemini 展開失敗。', 'error')
      } finally {
        setGeneratingNodeId(null)
      }
    },
    [aiExpandCount, axis.x, axis.y, document, flowDirection, onStatus, persistDocument],
  )

  const buildNodes = useCallback(
    (sourceDocument: CanvasDocument): Node[] =>
      Object.values(sourceDocument.nodes).map((node) => ({
        id: node.id,
        type: 'thought',
        position: node.position,
        sourcePosition: axis.source,
        targetPosition: axis.target,
        data: {
          thoughtNode: node,
          controlDock,
          sourcePosition: axis.source,
          targetPosition: axis.target,
          textScale: nodeTextScale,
          theme,
          geminiEnabled,
          isGenerating: generatingNodeId === node.id,
          onAddChild: handleAddChild,
          onGenerate: handleGenerate,
          onDelete: handleDelete,
          onToggleExpand: handleToggleExpand,
          onCommit: handleCommit,
        },
      })),
    [axis.source, axis.target, controlDock, geminiEnabled, generatingNodeId, handleAddChild, handleDelete, handleGenerate, handleToggleExpand, handleCommit, nodeTextScale, theme],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(document))
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(document))

  useEffect(() => {
    setNodes(buildNodes(document))
    setEdges(buildEdges(document))
  }, [document, buildNodes, buildEdges, setNodes, setEdges])

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, draggedNode: Node) => {
      const currentNode = document.nodes[draggedNode.id]
      if (!currentNode) return

      persistDocument({
        ...document,
        nodes: {
          ...document.nodes,
          [draggedNode.id]: {
            ...currentNode,
            position: draggedNode.position,
            updatedAt: new Date().toISOString(),
          },
        },
      })
    },
    [document, persistDocument],
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

      persistDocument({ ...document, nodes: nextNodes })
      onStatus('已更新節點連線關係。', 'success')
    },
    [document, onStatus, persistDocument],
  )

  return (
    <div className={`flow-shell theme-${theme}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
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
          雙擊節點可展開細節，流向可從左側切換。
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

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
import type {
  CanvasDocument,
  ControlDock,
  FlowDirection,
  NodeShape,
  NodeSize,
  NodeTextScale,
  ThemeMode,
  ThoughtNode,
} from '../types/canvas'

type FlowNodeData = {
  thoughtNode: ThoughtNode
  controlDock: ControlDock
  sourcePosition: Position
  targetPosition: Position
  textScale: NodeTextScale
  shape: NodeShape
  size: NodeSize
  theme: ThemeMode
  canEdit: boolean
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
  nodeShape: NodeShape
  nodeSize: NodeSize
  theme: ThemeMode
  canEdit: boolean
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

function getBubbleStyle(shape: NodeShape, size: NodeSize) {
  switch (shape) {
    case 'ellipse':
      return {
        width: `${size + 48}px`,
        height: `${size}px`,
        borderRadius: `${Math.round(size / 2)}px`,
      }
    case 'rounded-rect':
      return {
        width: `${size + 56}px`,
        height: `${Math.max(120, size - 24)}px`,
        borderRadius: '28px',
      }
    case 'rounded-square':
      return {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '28px',
      }
    case 'circle':
    default:
      return {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '999px',
      }
  }
}

function FlowThoughtNode({ data, selected }: NodeProps<Node<FlowNodeData>>) {
  const { thoughtNode, controlDock, sourcePosition, targetPosition, textScale, shape, size, theme, canEdit, geminiEnabled, isGenerating } = data
  const [draftTitle, setDraftTitle] = useState(thoughtNode.title)
  const [draftContent, setDraftContent] = useState(thoughtNode.content)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setDraftTitle(thoughtNode.title)
  }, [thoughtNode.title])

  useEffect(() => {
    setDraftContent(thoughtNode.content)
  }, [thoughtNode.content])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const scheduleCommit = (patch: Partial<ThoughtNode>) => {
    if (!canEdit) return
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      data.onCommit(thoughtNode.id, patch)
    }, 280)
  }

  const commitDrafts = () => {
    if (!canEdit) return

    const patch: Partial<ThoughtNode> = {}
    if (draftTitle !== thoughtNode.title) patch.title = draftTitle
    if (draftContent !== thoughtNode.content) patch.content = draftContent
    if (Object.keys(patch).length > 0) {
      data.onCommit(thoughtNode.id, patch)
    }
  }

  const bubbleStyle = getBubbleStyle(shape, size)

  return (
    <div className={`flow-node theme-${theme} ${thoughtNode.isExpanded ? 'expanded' : 'compact'} ${selected ? 'selected' : ''}`} style={{ width: bubbleStyle.width }}>
      <Handle type="target" position={targetPosition} className="flow-node__handle" />
      <Handle type="source" position={sourcePosition} className="flow-node__handle" />

      <div
        className={`flow-node__bubble flow-node__bubble--${shape} ${isGenerating ? 'flow-node__bubble--generating' : ''}`}
        style={bubbleStyle}
        onDoubleClick={() => data.onToggleExpand(thoughtNode.id)}
      >
        {isGenerating && <div className="flow-node__generating-ring" aria-hidden="true" />}
        <span className="flow-node__title" style={{ fontSize: `${textScale}px` }}>{draftTitle}</span>
        <div className={`flow-node__actions flow-node__actions--${controlDock}`}>
          <button className="icon-button nodrag nopan" onClick={() => data.onAddChild(thoughtNode.id)} title="新增子節點" disabled={!canEdit}>
            +
          </button>
          <button
            className={`icon-button secondary nodrag nopan ${isGenerating ? 'icon-button--generating' : ''}`}
            onClick={() => data.onGenerate(thoughtNode.id)}
            disabled={!canEdit || !geminiEnabled || isGenerating}
            title={geminiEnabled ? '使用 AI 產生子節點建議' : 'AI 功能暫時不可用'}
          >
            {isGenerating ? '✦' : '✨'}
          </button>
          {thoughtNode.parentId && (
            <button className="icon-button danger nodrag nopan" onClick={() => data.onDelete(thoughtNode.id)} title="刪除節點" disabled={!canEdit}>
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
            onChange={(event) => {
              const next = event.target.value
              setDraftTitle(next)
              scheduleCommit({ title: next, content: draftContent })
            }}
            onBlur={commitDrafts}
            disabled={!canEdit}
          />
          <textarea
            className="flow-node__textarea"
            value={draftContent}
            placeholder="在這裡寫下這個節點的內容..."
            onChange={(event) => {
              const next = event.target.value
              setDraftContent(next)
              scheduleCommit({ title: draftTitle, content: next })
            }}
            onBlur={commitDrafts}
            disabled={!canEdit}
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
  nodeShape,
  nodeSize,
  theme,
  canEdit,
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
      if (!canEdit) return
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
    [axis.x, axis.y, canEdit, document, persistDocument],
  )

  const handleDelete = useCallback(
    (nodeId: string) => {
      if (!canEdit) return
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
    [canEdit, document, persistDocument],
  )

  const handleToggleExpand = useCallback(
    (nodeId: string) => {
      if (!canEdit) return
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
    [canEdit, document, persistDocument],
  )

  const handleCommit = useCallback(
    (nodeId: string, patch: Partial<ThoughtNode>) => {
      if (!canEdit) return
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
    [canEdit, document, persistDocument],
  )

  const buildEdges = useCallback(
    (sourceDocument: CanvasDocument) => buildFlowEdges(sourceDocument, flowDirection),
    [flowDirection],
  )

  useEffect(() => {
    if (!canEdit) return
    if (lastFlowDirectionRef.current === flowDirection) return
    lastFlowDirectionRef.current = flowDirection

    persistDocument(layoutDocument(document, flowDirection))
  }, [canEdit, document, flowDirection, persistDocument])

  const handleGenerate = useCallback(
    async (nodeId: string) => {
      if (!canEdit) {
        onStatus('View only mode', 'neutral')
        return
      }

      const node = document.nodes[nodeId]
      if (!node) return

      setGeneratingNodeId(nodeId)
      onStatus('', 'neutral')
      try {
        const suggestions = await generateChildSuggestions(document, node, aiExpandCount)
        if (!suggestions.length) {
          onStatus('AI 沒有產出可用建議，請再試一次。', 'error')
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
        onStatus(`AI 已為「${node.title}」新增 ${suggestions.length} 個子節點。`, 'success')
      } catch (error) {
        onStatus(error instanceof Error ? error.message : 'AI 展開失敗。', 'error')
      } finally {
        setGeneratingNodeId(null)
      }
    },
    [aiExpandCount, axis.x, axis.y, canEdit, document, flowDirection, onStatus, persistDocument],
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
          shape: nodeShape,
          size: nodeSize,
          theme,
          canEdit,
          geminiEnabled,
          isGenerating: generatingNodeId === node.id,
          onAddChild: handleAddChild,
          onGenerate: handleGenerate,
          onDelete: handleDelete,
          onToggleExpand: handleToggleExpand,
          onCommit: handleCommit,
        },
      })),
    [axis.source, axis.target, canEdit, controlDock, geminiEnabled, generatingNodeId, handleAddChild, handleDelete, handleGenerate, handleToggleExpand, handleCommit, nodeShape, nodeSize, nodeTextScale, theme],
  )

  const derivedNodes = useMemo(() => buildNodes(document), [buildNodes, document])
  const derivedEdges = useMemo(() => buildEdges(document), [buildEdges, document])

  const [, , onNodesChange] = useNodesState(derivedNodes)
  const [, , onEdgesChange] = useEdgesState(derivedEdges)

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[FlowCanvas sync]', {
        canvasId: document.canvas.id,
        nodeCount: derivedNodes.length,
        edgeCount: derivedEdges.length,
        flowDirection,
        canEdit,
      })
    }
  }, [document.canvas.id, document.canvas.updatedAt, derivedNodes.length, derivedEdges.length, flowDirection, canEdit])

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent | React.TouchEvent, draggedNode: Node) => {
      if (!canEdit) return
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
    [canEdit, document, persistDocument],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) return
      if (!connection.source || !connection.target) return
      const child = document.nodes[connection.target]
      const parent = document.nodes[connection.source]
      if (!child || !parent || child.parentId === parent.id || child.id === document.canvas.rootNodeId) return

      persistDocument({
        ...document,
        nodes: {
          ...document.nodes,
          ...(child.parentId
            ? {
                [child.parentId]: {
                  ...document.nodes[child.parentId],
                  childIds: document.nodes[child.parentId].childIds.filter((id) => id !== child.id),
                  updatedAt: new Date().toISOString(),
                },
              }
            : {}),
          [parent.id]: {
            ...parent,
            childIds: Array.from(new Set([...parent.childIds, child.id])),
            updatedAt: new Date().toISOString(),
          },
          [child.id]: {
            ...child,
            parentId: parent.id,
            updatedAt: new Date().toISOString(),
          },
        },
      })
    },
    [canEdit, document, persistDocument],
  )

  return (
    <div className="flow-shell">
      <ReactFlow
        nodes={derivedNodes}
        edges={derivedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        elementsSelectable
        fitView
        nodeTypes={nodeTypes}
        colorMode={theme === 'dark' ? 'dark' : 'light'}
        minZoom={0.2}
        maxZoom={1.8}
        fitViewOptions={{ padding: 0.22 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
        <Controls showInteractive={false} position="bottom-right" />
        <Panel position="top-right" className="flow-hint-panel">
          {canEdit ? 'Double click a node to edit, drag to reposition, connect handles to re-parent.' : 'View only mode'}
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

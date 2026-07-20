import { useCallback, useMemo, type MouseEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useProjectStore } from '@/store/projectStore'
import type { GraphNode, GraphEdge, EdgeKind, NodeKind } from '@/types/project'
import { ideBus } from '@/runtime/ideRuntime'
import { edgeTypes } from './edgeTypes'
import { TLNode, kindColor, type TLNodeData } from './nodes/TLNode'
import { Palette } from './Palette'

/** Logical event-out port for a node kind (Visual Café). */
function defaultEventOutPort(kind?: NodeKind): string {
  if (kind === 'query') return 'onMatch'
  return 'onClick'
}

/** Logical event-in port for a node kind (Visual Café). */
function defaultEventInPort(kind?: NodeKind): string {
  if (kind === 'console') return 'log'
  if (kind === 'matrixView' || kind === 'highlight') return 'highlight'
  return 'run'
}

function isGenericEventHandle(handle?: string | null): boolean {
  return (
    handle == null
    || handle === ''
    || handle === 'event-out'
    || handle === 'event-in'
    || handle === 'out'
    || handle === 'in'
  )
}

const nodeTypes: NodeTypes = {
  tl: TLNode,
}

const UI_EVENT_KINDS: ReadonlySet<NodeKind> = new Set([
  'button',
  'run',
  'matrixView',
  'console',
])

function toRFNode(n: GraphNode): Node<TLNodeData> {
  return {
    id: n.id,
    type: 'tl',
    position: n.position,
    data: {
      ...n,
      label: n.label,
      kind: n.kind,
    },
  }
}

function fromRFNode(n: Node): GraphNode {
  const d = n.data as TLNodeData & Partial<GraphNode>
  const kind = (d.kind ?? 'tensor') as NodeKind
  const label = String(d.label ?? kind)
  const nested = (d as { data?: Record<string, unknown> }).data
  return {
    id: n.id,
    kind,
    label,
    position: n.position,
    data: nested && typeof nested === 'object' && !Array.isArray(nested) ? nested : {},
    astId: typeof d.astId === 'string' ? d.astId : undefined,
  }
}

function toRFEdge(e: GraphEdge): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.kind,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    label: e.label,
  }
}

function fromRFEdge(e: Edge): GraphEdge {
  const kind: EdgeKind = e.type === 'event' ? 'event' : 'data'
  return {
    id: e.id,
    kind,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    label: typeof e.label === 'string' ? e.label : undefined,
  }
}

export function GraphCanvas() {
  const graph = useProjectStore((s) => s.project.graph)
  const setGraph = useProjectStore((s) => s.setGraph)
  const setSelected = useProjectStore((s) => s.setSelected)

  const nodes = useMemo(() => graph.nodes.map(toRFNode), [graph.nodes])
  const edges = useMemo(() => graph.edges.map(toRFEdge), [graph.edges])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const next = applyNodeChanges(changes, nodes)
      const selected = next.find((n) => n.selected)
      setSelected(selected?.id)
      setGraph(next.map(fromRFNode), graph.edges)
    },
    [nodes, graph.edges, setGraph, setSelected],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const next = applyEdgeChanges(changes, edges)
      setGraph(graph.nodes, next.map(fromRFEdge))
    },
    [edges, graph.nodes, setGraph],
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return

      const sourceNode = graph.nodes.find((n) => n.id === connection.source)
      const targetNode = graph.nodes.find((n) => n.id === connection.target)
      const handleIsEvent = connection.sourceHandle?.includes('event')
        || connection.targetHandle?.includes('event')
      const uiIsEvent =
        (sourceNode != null && UI_EVENT_KINDS.has(sourceNode.kind))
        || (targetNode != null && UI_EVENT_KINDS.has(targetNode.kind))

      const kind: EdgeKind = handleIsEvent || uiIsEvent ? 'event' : 'data'

      let sourceHandle = connection.sourceHandle ?? undefined
      let targetHandle = connection.targetHandle ?? undefined
      if (kind === 'event') {
        if (isGenericEventHandle(sourceHandle)) {
          sourceHandle = defaultEventOutPort(sourceNode?.kind)
        }
        if (isGenericEventHandle(targetHandle)) {
          targetHandle = defaultEventInPort(targetNode?.kind)
        }
      }

      const edge: GraphEdge = {
        id: `e-${crypto.randomUUID()}`,
        kind,
        source: connection.source,
        target: connection.target,
        sourceHandle,
        targetHandle,
      }
      setGraph(graph.nodes, [...graph.edges, edge])
    },
    [graph.nodes, graph.edges, setGraph],
  )

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      setSelected(node.id)
      const kind = String((node.data as TLNodeData | undefined)?.kind ?? '')
      if (kind === 'run' || kind === 'button') {
        ideBus.emit(`${node.id}:onClick`)
      }
    },
    [setSelected],
  )

  return (
    <div className="relative flex-1 min-h-0 w-full">
      <Palette />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        defaultEdgeOptions={{ type: 'data' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1e293b" />
        <Controls className="!bg-slate-900 !border-slate-700 !shadow-none" />
        <MiniMap
          nodeColor={(n) => kindColor(String((n.data as TLNodeData | undefined)?.kind ?? ''))}
          maskColor="rgba(11, 18, 32, 0.7)"
          className="!bg-[#0c1424] !border-slate-800"
        />
      </ReactFlow>
    </div>
  )
}

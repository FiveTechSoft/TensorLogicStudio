import { useCallback, useEffect, useMemo, type MouseEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  useNodesInitialized,
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
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { edgeTypes } from './edgeTypes'
import { TLNode, kindColor, type TLNodeData } from './nodes/TLNode'
import { Palette } from './Palette'
import { setReactFlowInstance } from './rfApi'

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
  // Flatten payload so TLNode can read role/caption/shape from data.*
  return {
    id: n.id,
    type: 'tl',
    position: n.position,
    data: {
      label: n.label,
      kind: n.kind,
      astId: n.astId,
      ...n.data,
    },
  }
}

function fromRFNode(n: Node): GraphNode {
  const d = n.data as TLNodeData & Record<string, unknown>
  const kind = (d.kind ?? 'tensor') as NodeKind
  const label = String(d.label ?? kind)
  const astId = typeof d.astId === 'string' ? d.astId : undefined
  const { label: _l, kind: _k, astId: _a, ...payload } = d
  return {
    id: n.id,
    kind,
    label,
    position: n.position,
    data: payload as Record<string, unknown>,
    astId,
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

/** Fit / focus when project loads or + New Tensor sets focusNodeId. */
function FitViewOnLoad() {
  const projectId = useProjectStore((s) => s.project.id)
  const exampleId = useProjectStore((s) => s.project.meta.exampleId)
  const nodeCount = useProjectStore((s) => s.project.graph.nodes.length)
  const focusNodeId = useProjectStore((s) => s.focusNodeId)
  const setFocusNodeId = useProjectStore((s) => s.setFocusNodeId)
  const nodeSig = useProjectStore((s) =>
    s.project.graph.nodes.map((n) => n.id).join(','),
  )
  const rf = useReactFlow()
  const { fitView } = rf
  const nodesInitialized = useNodesInitialized()

  useEffect(() => {
    setReactFlowInstance(rf)
    return () => setReactFlowInstance(null)
  }, [rf])

  useEffect(() => {
    if (nodeCount === 0 || !nodesInitialized) return
    // Don't auto-fit when focusing a brand-new tensor — revealNodeInView handles that
    if (focusNodeId) return
    const t = window.setTimeout(() => {
      fitView({ padding: 0.3, duration: 200, maxZoom: 1.2 })
    }, 60)
    return () => window.clearTimeout(t)
  }, [projectId, exampleId, nodeCount, nodeSig, fitView, nodesInitialized, focusNodeId])

  useEffect(() => {
    if (!focusNodeId) return
    const clear = window.setTimeout(() => setFocusNodeId(null), 800)
    return () => window.clearTimeout(clear)
  }, [focusNodeId, setFocusNodeId])

  return null
}

export function GraphCanvas() {
  const graph = useProjectStore((s) => s.project.graph)
  const setGraph = useProjectStore((s) => s.setGraph)
  const setSelected = useProjectStore((s) => s.setSelected)

  const nodes = useMemo(() => graph.nodes.map(toRFNode), [graph.nodes])
  const edges = useMemo(() => graph.edges.map(toRFEdge), [graph.edges])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Always apply against the latest store graph (not a stale render snapshot),
      // otherwise a dimensions/select event can wipe a just-added + New Tensor box.
      const state = useProjectStore.getState()
      const current = state.project.graph.nodes.map(toRFNode)
      const next = applyNodeChanges(changes, current)
      const selected = next.find((n) => n.selected)
      if (selected) setSelected(selected.id)
      setGraph(
        next.map(fromRFNode),
        state.project.graph.edges,
      )
    },
    [setGraph, setSelected],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const state = useProjectStore.getState()
      const current = state.project.graph.edges.map(toRFEdge)
      const next = applyEdgeChanges(changes, current)
      setGraph(state.project.graph.nodes, next.map(fromRFEdge))
    },
    [setGraph],
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
      const nextEdges = [...graph.edges, edge]
      setGraph(graph.nodes, nextEdges)
      // Dataflow edges regenerate TensorLogic source (two-way)
      if (kind === 'data') {
        queueMicrotask(() => {
          const srcL = sourceNode?.label ?? connection.source
          const tgtL = targetNode?.label ?? connection.target
          pushGraphToSource(`Wired ${srcL} → ${tgtL} → code updated`)
        })
      }
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
    <div className="relative flex-1 min-h-0 w-full h-full" style={{ minHeight: 320 }}>
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
        fitViewOptions={{ padding: 0.25, maxZoom: 1.15 }}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        defaultEdgeOptions={{ type: 'data' }}
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        onlyRenderVisibleElements={false}
        style={{ width: '100%', height: '100%' }}
      >
        <FitViewOnLoad />
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

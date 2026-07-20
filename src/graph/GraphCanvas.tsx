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
  MarkerType,
  ConnectionMode,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  type Connection,
  type IsValidConnection,
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

const nodeTypes: NodeTypes = {
  tl: TLNode,
}

function toRFNode(n: GraphNode, selectedId?: string): Node<TLNodeData> {
  // Flatten payload so TLNode can read role/caption/shape from data.*
  return {
    id: n.id,
    type: 'tl',
    position: n.position,
    selected: selectedId != null && n.id === selectedId,
    connectable: true,
    draggable: true,
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
  const isEvent = e.kind === 'event'
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.kind,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    label: e.label,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: isEvent ? '#f472b6' : '#38bdf8',
    },
    style: {
      stroke: isEvent ? '#f472b6' : '#38bdf8',
      strokeWidth: 2.5,
    },
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
  const selectedId = useProjectStore((s) => s.project.ui.selectedId)
  const setGraph = useProjectStore((s) => s.setGraph)
  const setSelected = useProjectStore((s) => s.setSelected)

  const nodes = useMemo(
    () => graph.nodes.map((n) => toRFNode(n, selectedId)),
    [graph.nodes, selectedId],
  )
  const edges = useMemo(() => graph.edges.map(toRFEdge), [graph.edges])

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Always apply against the latest store graph (not a stale render snapshot),
      // otherwise a dimensions/select event can wipe a just-added + New Tensor box.
      const state = useProjectStore.getState()
      const current = state.project.graph.nodes.map((n) =>
        toRFNode(n, state.project.ui.selectedId),
      )
      const removedIds = new Set(
        changes
          .filter((c): c is { type: 'remove'; id: string } => c.type === 'remove')
          .map((c) => c.id),
      )
      const next = applyNodeChanges(changes, current)
      const selected = next.find((n) => n.selected)

      let nextEdges = state.project.graph.edges
      if (removedIds.size > 0) {
        nextEdges = nextEdges.filter(
          (e) => !removedIds.has(e.source) && !removedIds.has(e.target),
        )
        if (state.project.ui.selectedId && removedIds.has(state.project.ui.selectedId)) {
          setSelected(undefined)
        }
        const labels = state.project.graph.nodes
          .filter((n) => removedIds.has(n.id))
          .map((n) => n.label)
          .join(', ')
        useProjectStore.getState().setStatus(`Deleted: ${labels || [...removedIds].join(', ')}`)
        useProjectStore.getState().appendConsole(`Deleted node(s): ${labels || [...removedIds].join(', ')}`)
      } else if (selected) {
        setSelected(selected.id)
      } else if (changes.some((c) => c.type === 'select')) {
        // Deselected all
        const still = next.find((n) => n.selected)
        if (!still) setSelected(undefined)
      }

      setGraph(next.map(fromRFNode), nextEdges)

      if (removedIds.size > 0) {
        queueMicrotask(() => {
          pushGraphToSource('Node deleted → code updated')
        })
      }
    },
    [setGraph, setSelected],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const state = useProjectStore.getState()
      const current = state.project.graph.edges.map(toRFEdge)
      const removed = changes.some((c) => c.type === 'remove')
      const next = applyEdgeChanges(changes, current)
      setGraph(state.project.graph.nodes, next.map(fromRFEdge))
      if (removed) {
        queueMicrotask(() => {
          pushGraphToSource('Edge deleted → code updated')
        })
        useProjectStore.getState().setStatus('Flecha eliminada')
      }
    },
    [setGraph],
  )

  // Delete / Backspace when a tensor (or any node) is selected
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      // Don't steal keys from Monaco / inputs / spreadsheet
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable ||
          t.closest('.monaco-editor') ||
          t.closest('input') ||
          t.closest('textarea'))
      ) {
        return
      }

      const state = useProjectStore.getState()
      const id = state.project.ui.selectedId
      if (!id) return

      const node = state.project.graph.nodes.find((n) => n.id === id)
      if (!node) return

      e.preventDefault()
      const nextNodes = state.project.graph.nodes.filter((n) => n.id !== id)
      const nextEdges = state.project.graph.edges.filter(
        (ed) => ed.source !== id && ed.target !== id,
      )
      setGraph(nextNodes, nextEdges)
      setSelected(undefined)
      useProjectStore.getState().setStatus(`Deleted: ${node.label}`)
      useProjectStore.getState().appendConsole(`Deleted node: ${node.label}`)
      queueMicrotask(() => pushGraphToSource(`Deleted ${node.label} → code updated`))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setGraph, setSelected])

  // Accept any source→target pair on different nodes (handles are data-only).
  const isValidConnection: IsValidConnection = useCallback((c: Connection | Edge) => {
    return Boolean(c.source && c.target && c.source !== c.target)
  }, [])

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return

      const state = useProjectStore.getState()
      const nodesNow = state.project.graph.nodes
      const edgesNow = state.project.graph.edges

      const sourceNode = nodesNow.find((n) => n.id === connection.source)
      const targetNode = nodesNow.find((n) => n.id === connection.target)

      const sourceHandle = connection.sourceHandle || 'data-out'
      const targetHandle = connection.targetHandle || 'data-in'

      const dup = edgesNow.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.kind === 'data',
      )
      if (dup) {
        useProjectStore.getState().setStatus('Ya existe esa flecha')
        return
      }

      const edge: GraphEdge = {
        id: `e-${crypto.randomUUID()}`,
        kind: 'data',
        source: connection.source,
        target: connection.target,
        sourceHandle,
        targetHandle,
        label: '→',
      }
      setGraph(nodesNow, [...edgesNow, edge])
      useProjectStore.setState({
        graphLockUntil: Date.now() + 2000,
        skipNextSourceToGraph: true,
      })
      useProjectStore
        .getState()
        .setStatus(
          `Flecha: ${sourceNode?.label ?? '?'} → ${targetNode?.label ?? '?'}`,
        )
      useProjectStore
        .getState()
        .appendConsole(
          `Arrow ${sourceNode?.label ?? connection.source} → ${targetNode?.label ?? connection.target}`,
        )

      queueMicrotask(() => {
        pushGraphToSource(
          `Wired ${sourceNode?.label ?? connection.source} → ${targetNode?.label ?? connection.target}`,
        )
      })
    },
    [setGraph],
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
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.15 }}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        // Loose: source handle can connect to any target handle
        connectionMode={ConnectionMode.Loose}
        // Larger snap radius so dropping on the blue port is easy
        connectionRadius={40}
        connectionLineStyle={{ stroke: '#38bdf8', strokeWidth: 3 }}
        defaultEdgeOptions={{
          type: 'data',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#38bdf8',
            width: 18,
            height: 18,
          },
        }}
        minZoom={0.3}
        maxZoom={2}
        // Left-drag on empty pane pans; handles still start connections
        // Middle/right pan is also enabled; space+drag works via RF defaults
        panOnDrag
        panOnScroll
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        edgesFocusable
        nodesFocusable
        edgesReconnectable={false}
        deleteKeyCode={['Backspace', 'Delete']}
        onlyRenderVisibleElements={false}
        elevateNodesOnSelect
        style={{ width: '100%', height: '100%' }}
        onConnectStart={(_, { handleType }) => {
          if (handleType === 'source') {
            useProjectStore
              .getState()
              .setStatus('Arrastra hasta el punto azul de otra caja…')
          }
        }}
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

import { useCallback, useEffect, useMemo, useRef, type MouseEvent } from 'react'
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
import { TLNode, kindColor, type TLNodeData } from './nodes/TLNode'
import { Palette } from './Palette'
import { DataArrowsOverlay } from './DataArrowsOverlay'
import { setReactFlowInstance } from './rfApi'

const nodeTypes: NodeTypes = {
  tl: TLNode,
}

function toRFNode(n: GraphNode, selectedId?: string): Node<TLNodeData> {
  // Flatten payload so TLNode can read role/caption/shape from data.*
  // Explicit width/height help React Flow compute edge paths immediately.
  return {
    id: n.id,
    type: 'tl',
    position: n.position,
    selected: selectedId != null && n.id === selectedId,
    connectable: true,
    draggable: true,
    width: 180,
    height: 110,
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
  // Minimal edge — RF default renderer. Do not bind handle ids unless needed;
  // mismatched handle ids prevent edges from rendering at all.
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? (isEvent ? undefined : '→'),
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: isEvent ? '#f472b6' : '#38bdf8',
    },
    style: {
      stroke: isEvent ? '#f472b6' : '#38bdf8',
      strokeWidth: 3,
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

/** Shared helper: create a data edge between two nodes and sync code. */
export function connectDataNodes(sourceId: string, targetId: string): boolean {
  if (!sourceId || !targetId || sourceId === targetId) return false
  const state = useProjectStore.getState()
  const nodesNow = state.project.graph.nodes
  const edgesNow = state.project.graph.edges
  const sourceNode = nodesNow.find((n) => n.id === sourceId)
  const targetNode = nodesNow.find((n) => n.id === targetId)
  if (!sourceNode || !targetNode) return false

  const dup = edgesNow.some(
    (e) => e.source === sourceId && e.target === targetId && e.kind === 'data',
  )
  if (dup) {
    state.setStatus('Ya existe esa flecha')
    return false
  }

  const edge: GraphEdge = {
    id: `e-${crypto.randomUUID()}`,
    kind: 'data',
    source: sourceId,
    target: targetId,
    label: '→',
  }
  state.setGraph(nodesNow, [...edgesNow, edge])
  useProjectStore.setState({
    graphLockUntil: Date.now() + 2500,
    skipNextSourceToGraph: true,
  })
  state.setStatus(`Flecha: ${sourceNode.label} → ${targetNode.label}`)
  state.appendConsole(`Arrow ${sourceNode.label} → ${targetNode.label}`)
  queueMicrotask(() => {
    pushGraphToSource(`Wired ${sourceNode.label} → ${targetNode.label}`)
  })
  return true
}

export function GraphCanvas() {
  const graph = useProjectStore((s) => s.project.graph)
  const selectedId = useProjectStore((s) => s.project.ui.selectedId)
  const setGraph = useProjectStore((s) => s.setGraph)
  const setSelected = useProjectStore((s) => s.setSelected)
  // Two-click link mode: first click on source handle, second on target
  const linkFromRef = useRef<string | null>(null)

  const nodes = useMemo(
    () => graph.nodes.map((n) => toRFNode(n, selectedId)),
    [graph.nodes, selectedId],
  )
  const edges = useMemo(() => {
    const mapped = graph.edges.map(toRFEdge)
    return mapped
  }, [graph.edges])

  // Debug: keep edge count in DOM for tests / diagnosis
  useEffect(() => {
    const el = document.getElementById('tls-edge-debug')
    if (el) el.textContent = `edges:${graph.edges.length}`
  }, [graph.edges])

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

      // Ignore pure position/select/dimensions noise that could race with connect —
      // still apply them, but ALWAYS re-read edges from store AFTER apply so a
      // concurrent connectDataNodes edge is never dropped.
      const next = applyNodeChanges(changes, current)
      const selected = next.find((n) => n.selected)

      // Fresh edges after any concurrent setGraph from connect
      let nextEdges = useProjectStore.getState().project.graph.edges
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
        const still = next.find((n) => n.selected)
        if (!still) setSelected(undefined)
      }

      // Merge RF node positions with store, keep store edges intact
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

  const onConnect: OnConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return
    connectDataNodes(connection.source, connection.target)
    linkFromRef.current = null
  }, [])

  // Expose for Playwright / console debugging
  useEffect(() => {
    const w = window as unknown as {
      __tlsConnect?: (a: string, b: string) => boolean
      __tlsEdgeCount?: () => number
      __tlsDumpGraph?: () => { nodes: string[]; edges: string[] }
    }
    w.__tlsConnect = connectDataNodes
    w.__tlsEdgeCount = () => useProjectStore.getState().project.graph.edges.length
    w.__tlsDumpGraph = () => {
      const g = useProjectStore.getState().project.graph
      return {
        nodes: g.nodes.map((n) => n.id),
        edges: g.edges.map((e) => `${e.source}->${e.target}(${e.kind})`),
      }
    }
    return () => {
      delete w.__tlsConnect
      delete w.__tlsEdgeCount
      delete w.__tlsDumpGraph
    }
  }, [])

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

  /**
   * Two-click wiring fallback (more reliable than drag in some browsers):
   * click source handle → click target handle.
   */
  const onPaneClick = useCallback(() => {
    if (linkFromRef.current) {
      linkFromRef.current = null
      useProjectStore.getState().setStatus('Conexión cancelada')
    }
  }, [])

  return (
    <div className="relative flex-1 min-h-0 w-full h-full" style={{ minHeight: 320 }}>
      <Palette />
      <div
        id="tls-edge-debug"
        className="absolute bottom-2 left-14 z-20 text-[10px] text-slate-500 font-mono pointer-events-none"
      >
        edges:{graph.edges.length}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
          type: 'default',
          animated: false,
          style: { stroke: '#38bdf8', strokeWidth: 3 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#38bdf8',
            width: 20,
            height: 20,
          },
        }}
        minZoom={0.3}
        maxZoom={2}
        // Free left mouse for handle-drag connections; pan with middle mouse or trackpad
        panOnDrag={[1, 2]}
        panOnScroll
        zoomOnScroll
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
        onPaneClick={onPaneClick}
        onConnectStart={(_, params) => {
          if (params.handleType === 'source' && params.nodeId) {
            linkFromRef.current = params.nodeId
            useProjectStore
              .getState()
              .setStatus('Suelta en el punto azul de la otra caja (o haz clic en ella)')
          }
        }}
        onConnectEnd={(event) => {
          // Two-click / click-target fallback if drag did not hit a handle
          if (!linkFromRef.current) return
          const from = linkFromRef.current
          const t = event.target as HTMLElement | null
          const handle = t?.closest?.('.react-flow__handle') as HTMLElement | null
          const nodeEl = t?.closest?.('.react-flow__node') as HTMLElement | null
          let targetId: string | null = null
          if (handle?.dataset.nodeid && handle.classList.contains('target')) {
            targetId = handle.dataset.nodeid
          } else if (nodeEl?.dataset.id) {
            targetId = nodeEl.dataset.id
          }
          if (targetId && targetId !== from) {
            connectDataNodes(from, targetId)
          }
          linkFromRef.current = null
        }}
      >
        <FitViewOnLoad />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1e293b" />
        <DataArrowsOverlay />
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

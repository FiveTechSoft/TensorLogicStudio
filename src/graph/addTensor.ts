import { nextTensorLabel } from '@/editor/graphToSource'
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import {
  createInitMatrix,
  defaultDomainLabels,
  matrixToRowMajor,
  type InitMode,
} from '@/core/tensor/initMatrix'
import { rewriteRelationFacts } from '@/core/source/rewriteRelationFacts'
import { useProjectStore } from '@/store/projectStore'
import { ideRuntime } from '@/runtime/ideRuntime'
import type { GraphNode } from '@/types/project'
import { getReactFlowInstance } from './rfApi'

export type { InitMode }

function placeOffset(nodes: GraphNode[]): { x: number; y: number } {
  const tensors = nodes.filter((n) => n.kind === 'relation' || n.kind === 'tensor')
  const rf = getReactFlowInstance()
  const pane =
    typeof document !== 'undefined'
      ? (document.querySelector('.react-flow') as HTMLElement | null)
      : null

  if (tensors.length === 0 && rf && pane) {
    const rect = pane.getBoundingClientRect()
    const flowPos = rf.screenToFlowPosition({
      x: rect.left + rect.width * 0.25,
      y: rect.top + rect.height * 0.45,
    })
    return { x: flowPos.x - 90, y: flowPos.y - 50 }
  }

  if (tensors.length > 0) {
    const rightmost = tensors.reduce((a, b) =>
      a.position.x >= b.position.x ? a : b,
    )
    return {
      x: rightmost.position.x + 320,
      y: rightmost.position.y,
    }
  }

  return { x: 80, y: 140 }
}

export interface AddTensorOptions {
  kind?: 'relation' | 'tensor'
  /** zeros (default) or random values */
  init?: InitMode
  /** Domain size for bool / side length for dense square (default 4 bool / 2 dense) */
  size?: number
}

/**
 * Add a visible tensor box, optionally initialized with zeros or random values.
 * Returns the new node id.
 */
export function addTensorBox(
  kindOrOpts: 'relation' | 'tensor' | AddTensorOptions = 'relation',
  initArg?: InitMode,
): string {
  const opts: AddTensorOptions =
    typeof kindOrOpts === 'string'
      ? { kind: kindOrOpts, init: initArg ?? 'zeros' }
      : { kind: 'relation', init: 'zeros', ...kindOrOpts }

  const kind = opts.kind ?? 'relation'
  const init = opts.init ?? 'zeros'
  const size = opts.size ?? (kind === 'relation' ? 4 : 2)

  const s = useProjectStore.getState()
  const { nodes, edges } = s.project.graph
  const label = nextTensorLabel(nodes, kind)
  const baseId = kind === 'relation' ? `relation-${label}` : `tensor-${label}`
  const id = nodes.some((n) => n.id === baseId)
    ? `${baseId}-${crypto.randomUUID().slice(0, 8)}`
    : baseId

  const shape: [number, number] = [size, size]
  const matrix = createInitMatrix(
    init,
    size,
    size,
    kind === 'relation' ? 'bool' : 'dense',
  )

  const node: GraphNode = {
    id,
    kind,
    label,
    position: placeOffset(nodes),
    data: {
      createdVisually: true,
      role: 'factor',
      caption:
        kind === 'relation'
          ? `bool · ${init}`
          : `dense · ${init}`,
      shape,
      init,
    },
  }

  const nextNodes = [...nodes, node]
  s.setGraph(nextNodes, edges)
  s.setSelected(id)
  s.openSpreadsheet(label, kind === 'relation' ? 'bool' : 'dense')
  useProjectStore.setState({
    skipNextSourceToGraph: true,
    graphLockUntil: Date.now() + 2500,
    focusNodeId: id,
  })

  // Apply initialization to source / dense seeds
  if (kind === 'relation') {
    const labels = defaultDomainLabels(size)
    const nextSource = rewriteRelationFacts(
      s.project.source,
      label,
      labels,
      matrix,
    )
    s.setSourceFromGraph(nextSource)
  } else {
    const data = matrixToRowMajor(matrix)
    s.setDenseSeed(label, { shape: [...shape], data })
    ideRuntime.seedDense(label, [...shape], data)
  }

  const reveal = () => {
    const rf = getReactFlowInstance()
    if (!rf) return
    const tensorIds = useProjectStore
      .getState()
      .project.graph.nodes.filter((n) => n.kind === 'relation' || n.kind === 'tensor')
      .map((n) => ({ id: n.id }))
    if (tensorIds.length === 0) return
    rf.fitView({
      nodes: tensorIds,
      padding: 0.35,
      duration: 200,
      maxZoom: 1.15,
      minZoom: 0.45,
    })
  }
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(reveal)
  } else {
    setTimeout(reveal, 0)
  }
  if (typeof window !== 'undefined') {
    window.setTimeout(reveal, 150)
  }

  queueMicrotask(() => {
    pushGraphToSource(
      `New tensor ${label} (${kind === 'relation' ? 'bool' : 'dense'}, ${init})`,
    )
    const cur = useProjectStore.getState()
    if (!cur.project.graph.nodes.some((n) => n.id === id)) {
      cur.setGraph([...cur.project.graph.nodes, node], cur.project.graph.edges)
    }
    if (typeof window !== 'undefined') {
      window.setTimeout(reveal, 80)
    }
  })

  s.setStatus(`Created ${label} · init=${init}`)
  s.appendConsole(
    `+ New Tensor ${label} (${kind === 'relation' ? 'BOOL' : 'dense'}, ${init})`,
  )
  return id
}

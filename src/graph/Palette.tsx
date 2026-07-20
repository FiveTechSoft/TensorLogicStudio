import { useProjectStore } from '@/store/projectStore'
import type { GraphNode, NodeKind } from '@/types/project'
import { nextOpLabel, nextTensorLabel } from '@/editor/graphToSource'
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { kindColor } from './nodes/TLNode'

const OP_KINDS: NodeKind[] = [
  'einsum',
  'step',
  'relu',
  'sigmoid',
  'rule',
]

function opLabel(kind: NodeKind): string {
  switch (kind) {
    case 'einsum':
      return 'Einsum / join'
    case 'step':
      return 'Step'
    case 'relu':
      return 'ReLU'
    case 'sigmoid':
      return 'Sigmoid'
    case 'rule':
      return 'Rule'
    default:
      return kind
  }
}

function placeOffset(nodes: GraphNode[]): { x: number; y: number } {
  const n = nodes.length
  return { x: 120 + (n % 4) * 40 + n * 12, y: 100 + Math.floor(n / 4) * 30 + n * 18 }
}

export function Palette() {
  const nodes = useProjectStore((s) => s.project.graph.nodes)
  const edges = useProjectStore((s) => s.project.graph.edges)
  const setGraph = useProjectStore((s) => s.setGraph)
  const openSpreadsheet = useProjectStore((s) => s.openSpreadsheet)
  const setSelected = useProjectStore((s) => s.setSelected)
  const setStatus = useProjectStore((s) => s.setStatus)

  const addTensor = (kind: 'relation' | 'tensor') => {
    const label = nextTensorLabel(nodes, kind)
    const id = kind === 'relation' ? `relation:${label}` : `tensor:${label}`
    // Avoid id collision if node already exists
    const uniqueId = nodes.some((n) => n.id === id)
      ? `${id}-${crypto.randomUUID().slice(0, 8)}`
      : id
    const node: GraphNode = {
      id: uniqueId,
      kind,
      label,
      position: placeOffset(nodes),
      data: { createdVisually: true },
    }
    setGraph([...nodes, node], edges)
    setSelected(node.id)
    openSpreadsheet(label, kind === 'relation' ? 'bool' : 'dense')
    // Defer so setGraph state is flushed
    queueMicrotask(() => {
      pushGraphToSource(
        kind === 'relation'
          ? `New relation tensor ${label} → code`
          : `New dense tensor ${label} → code`,
      )
    })
    setStatus(`Created ${kind} ${label}`)
  }

  const addOp = (kind: NodeKind) => {
    const label = nextOpLabel(nodes, kind)
    const node: GraphNode = {
      id: `op-${kind}-${crypto.randomUUID().slice(0, 8)}`,
      kind,
      label,
      position: placeOffset(nodes),
      data: { createdVisually: true },
    }
    setGraph([...nodes, node], edges)
    setSelected(node.id)
    queueMicrotask(() => {
      pushGraphToSource(`Added operation ${label}`)
    })
  }

  return (
    <div className="absolute top-2 left-2 right-2 z-10 flex flex-col gap-1.5 pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700/90 bg-[#0c1424]/95 p-1.5 backdrop-blur-sm shadow-lg shadow-black/40">
        <button
          type="button"
          onClick={() => addTensor('relation')}
          className="px-3 py-1.5 rounded text-xs font-semibold border border-cyan-600/70 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/50 transition-colors"
          title="Create a Boolean / sparse tensor (relation). Then draw arrows to ops and other tensors — code updates on the left."
        >
          + New Tensor
        </button>
        <button
          type="button"
          onClick={() => addTensor('tensor')}
          className="px-2.5 py-1.5 rounded text-[11px] font-medium border border-slate-600 bg-slate-900/70 text-slate-200 hover:bg-slate-800 transition-colors"
          title="Create a dense float tensor"
        >
          + Dense
        </button>
        <span className="text-slate-700 text-xs px-1">|</span>
        {OP_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => addOp(kind)}
            className="px-2 py-1 rounded text-[11px] font-medium border border-slate-700/80 bg-slate-900/50 text-slate-200 hover:bg-slate-800 transition-colors"
            style={{ borderColor: `${kindColor(kind)}55`, color: kindColor(kind) }}
            title={`Add ${opLabel(kind)} — connect tensors with data arrows (cyan handles)`}
          >
            {opLabel(kind)}
          </button>
        ))}
      </div>
      <div className="pointer-events-none text-[10px] text-slate-500 px-1">
        Create 2 tensors → add an op → drag cyan handles to wire → code updates left
      </div>
    </div>
  )
}

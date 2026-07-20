import { useProjectStore } from '@/store/projectStore'
import type { GraphNode, NodeKind } from '@/types/project'
import { nextOpLabel } from '@/editor/graphToSource'
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { addTensorBox } from './addTensor'
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
  return { x: 140 + (n % 4) * 48, y: 120 + Math.floor(n / 4) * 70 }
}

export function Palette() {
  const setStatus = useProjectStore((s) => s.setStatus)

  const addOp = (kind: NodeKind) => {
    const s = useProjectStore.getState()
    const { nodes, edges } = s.project.graph
    const label = nextOpLabel(nodes, kind)
    const node: GraphNode = {
      id: `op-${kind}-${crypto.randomUUID().slice(0, 8)}`,
      kind,
      label,
      position: placeOffset(nodes),
      data: { createdVisually: true },
    }
    s.setGraph([...nodes, node], edges)
    s.setSelected(node.id)
    useProjectStore.setState({
      focusNodeId: node.id,
      skipNextSourceToGraph: true,
      graphLockUntil: Date.now() + 1500,
    })
    queueMicrotask(() => pushGraphToSource(`Added operation ${label}`))
    setStatus(`Created op ${label}`)
  }

  return (
    <div className="absolute top-2 left-2 right-2 z-10 flex flex-col gap-1.5 pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700/90 bg-[#0c1424]/95 p-1.5 backdrop-blur-sm shadow-lg shadow-black/40">
        <button
          type="button"
          onClick={() => addTensorBox('relation')}
          className="px-3 py-1.5 rounded text-xs font-semibold border border-cyan-600/70 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/50 transition-colors"
          title="Add a tensor box on the canvas (Boolean / sparse relation)"
        >
          + New Tensor
        </button>
        <button
          type="button"
          onClick={() => addTensorBox('tensor')}
          className="px-2.5 py-1.5 rounded text-[11px] font-medium border border-slate-600 bg-slate-900/70 text-slate-200 hover:bg-slate-800 transition-colors"
          title="Add a dense float tensor box on the canvas"
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
      <div className="pointer-events-none text-[10px] text-slate-500 px-1 flex flex-wrap gap-x-3 gap-y-0.5">
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-sky-400 align-middle mr-1" />
          <strong className="text-sky-400/90">Azul</strong> = datos (tensor → tensor / op)
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-pink-400 align-middle mr-1" />
          <strong className="text-pink-400/90">Rosa</strong> = eventos UI (Run, highlight…)
        </span>
        <span className="text-slate-600">
          Arrastra desde el punto azul derecho de una caja al azul izquierdo de otra
        </span>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import type { GraphNode, NodeKind } from '@/types/project'
import { nextOpLabel } from '@/editor/graphToSource'
import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { addTensorBox, type InitMode } from './addTensor'
import { kindColor } from './nodes/TLNode'

const OP_KINDS: NodeKind[] = [
  'einsum',
  'step',
  'relu',
  'sigmoid',
  'softmax',
  'rule',
  'loss',
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
    case 'softmax':
      return 'Softmax'
    case 'rule':
      return 'Rule'
    case 'loss':
      return 'Loss'
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
  const [tensorMenu, setTensorMenu] = useState(false)
  const [denseMenu, setDenseMenu] = useState(false)

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

  const createTensor = (kind: 'relation' | 'tensor', init: InitMode) => {
    setTensorMenu(false)
    setDenseMenu(false)
    addTensorBox({ kind, init })
  }

  return (
    <div className="absolute top-2 left-2 right-2 z-10 flex flex-col gap-1.5 pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700/90 bg-[#0c1424]/95 p-1.5 backdrop-blur-sm shadow-lg shadow-black/40">
        {/* New Tensor (BOOL) with init options */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setTensorMenu((o) => !o)
              setDenseMenu(false)
            }}
            className="px-3 py-1.5 rounded text-xs font-semibold border border-cyan-600/70 bg-cyan-950/50 text-cyan-300 hover:bg-cyan-900/50 transition-colors"
            title="Add Boolean tensor (relation) — choose zeros or random"
          >
            + New Tensor ▾
          </button>
          {tensorMenu && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded border border-slate-700 bg-[#0c1424] shadow-xl py-1">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => createTensor('relation', 'zeros')}
              >
                Zeros (0/1 vacíos)
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => createTensor('relation', 'random')}
              >
                Random (0/1 aleatorio)
              </button>
            </div>
          )}
        </div>

        {/* Dense with init options */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setDenseMenu((o) => !o)
              setTensorMenu(false)
            }}
            className="px-2.5 py-1.5 rounded text-[11px] font-medium border border-slate-600 bg-slate-900/70 text-slate-200 hover:bg-slate-800 transition-colors"
            title="Add dense float tensor — zeros or random"
          >
            + Dense ▾
          </button>
          {denseMenu && (
            <div className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded border border-slate-700 bg-[#0c1424] shadow-xl py-1">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => createTensor('tensor', 'zeros')}
              >
                Zeros (matriz 0)
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
                onClick={() => createTensor('tensor', 'random')}
              >
                Random (−1…1)
              </button>
            </div>
          )}
        </div>

        <span className="text-slate-700 text-xs px-1">|</span>
        {OP_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              setTensorMenu(false)
              setDenseMenu(false)
              addOp(kind)
            }}
            className="px-2 py-1 rounded text-[11px] font-medium border border-slate-700/80 bg-slate-900/50 text-slate-200 hover:bg-slate-800 transition-colors"
            style={{ borderColor: `${kindColor(kind)}55`, color: kindColor(kind) }}
            title={`Add ${opLabel(kind)}`}
          >
            {opLabel(kind)}
          </button>
        ))}
      </div>
      <div className="pointer-events-none text-[10px] text-slate-500 px-1">
        <span className="inline-block w-2 h-2 rounded-full bg-sky-400 align-middle mr-1" />
        Tensor: elige <strong className="text-slate-400">Zeros</strong> o{' '}
        <strong className="text-slate-400">Random</strong> · flechas del azul derecho al izquierdo
      </div>
    </div>
  )
}

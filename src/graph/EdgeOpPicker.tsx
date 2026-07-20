import { pushGraphToSource } from '@/editor/pushGraphToSource'
import { useProjectStore } from '@/store/projectStore'
import type { EdgeOp } from '@/types/project'
import { optionsForNodes, symbolForOp } from './edgeOps'
import { connectDataNodes } from './GraphCanvas'

export interface PendingLink {
  sourceId: string
  targetId: string
  /** If set, we are changing an existing edge's op */
  edgeId?: string
}

interface EdgeOpPickerProps {
  pending: PendingLink
  onClose: () => void
}

export function EdgeOpPicker({ pending, onClose }: EdgeOpPickerProps) {
  const nodes = useProjectStore((s) => s.project.graph.nodes)
  const setGraph = useProjectStore((s) => s.setGraph)
  const setStatus = useProjectStore((s) => s.setStatus)
  const appendConsole = useProjectStore((s) => s.appendConsole)

  const source = nodes.find((n) => n.id === pending.sourceId)
  const target = nodes.find((n) => n.id === pending.targetId)
  if (!source || !target) {
    onClose()
    return null
  }

  const opts = optionsForNodes(source, target)

  const apply = (op: EdgeOp) => {
    const symbol = symbolForOp(op)
    if (pending.edgeId) {
      const state = useProjectStore.getState()
      const edges = state.project.graph.edges.map((e) =>
        e.id === pending.edgeId ? { ...e, op, label: symbol } : e,
      )
      setGraph(state.project.graph.nodes, edges)
      setStatus(`Op: ${source.label} ${symbol} ${target.label}`)
      appendConsole(`Edge op → ${op} (${source.label} → ${target.label})`)
      queueMicrotask(() => pushGraphToSource(`Edge op ${op}`))
    } else {
      connectDataNodes(pending.sourceId, pending.targetId, op)
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-lg border border-slate-600 bg-[#0c1424] shadow-2xl p-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Elegir operación de la flecha"
      >
        <h3 className="text-sm font-semibold text-sky-300 mb-1">
          Operación de la flecha
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          <span className="text-slate-200 font-mono">{source.label}</span>
          {' → '}
          <span className="text-slate-200 font-mono">{target.label}</span>
          <br />
          Elige cómo se combinan en TensorLogic (suma, producto, copy, …)
        </p>
        <div className="flex flex-col gap-1 max-h-[50vh] overflow-auto">
          {opts.map((o) => (
            <button
              key={o.op}
              type="button"
              onClick={() => apply(o.op)}
              className="flex items-start gap-3 text-left px-3 py-2 rounded border border-slate-700 hover:border-sky-600 hover:bg-slate-900/80 transition-colors"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-700 bg-sky-950 text-sky-300 font-bold text-sm">
                {o.symbol}
              </span>
              <span>
                <span className="block text-xs font-medium text-slate-100">
                  {o.label}
                </span>
                <span className="block text-[10px] text-slate-500 leading-snug">
                  {o.description}
                </span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-xs text-slate-500 hover:text-slate-300 py-1"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

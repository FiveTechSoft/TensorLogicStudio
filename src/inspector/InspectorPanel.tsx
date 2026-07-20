import { PropertiesPanel } from './PropertiesPanel'
import { MatrixView } from './MatrixView'
import { QueryResults } from './QueryResults'
import { useProjectStore } from '@/store/projectStore'

export function InspectorPanel() {
  const matrices = useProjectStore((s) => s.matrices)
  const queryBindings = useProjectStore((s) => s.queryBindings)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Properties (selected node) */}
      <div className="shrink-0 max-h-[40%] min-h-[4rem] flex flex-col border-b border-slate-800 overflow-hidden">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-1.5 shrink-0">
          Properties
        </div>
        <div className="min-h-0 flex-1 overflow-auto flex flex-col">
          <PropertiesPanel />
        </div>
      </div>

      {/* Matrices */}
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Matrices
        </div>
        {matrices.length === 0 ? (
          <div className="text-xs text-slate-600 italic leading-relaxed">
            No tensors yet. Load{' '}
            <span className="text-slate-500 not-italic">Examples → Genealogy</span>{' '}
            or{' '}
            <span className="text-slate-500 not-italic">MLP</span>, then press{' '}
            <span className="text-slate-500 not-italic">Run</span> to populate
            heatmaps.
          </div>
        ) : (
          matrices.map((m, i) => (
            <MatrixView
              key={`${m.title}-${i}`}
              title={m.title}
              labels={m.labels}
              matrix={m.matrix}
            />
          ))
        )}

        <div className="text-[10px] uppercase tracking-widest text-slate-500 pt-2">
          Query results
        </div>
        <QueryResults bindings={queryBindings} />
      </div>
    </div>
  )
}

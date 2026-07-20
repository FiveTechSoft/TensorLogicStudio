import { PropertiesPanel } from './PropertiesPanel'
import { MatrixView } from './MatrixView'
import { QueryResults } from './QueryResults'
import { TensorSpreadsheet } from './TensorSpreadsheet'
import { useProjectStore } from '@/store/projectStore'

export function InspectorPanel() {
  const matrices = useProjectStore((s) => s.matrices)
  const queryBindings = useProjectStore((s) => s.queryBindings)
  const spreadsheet = useProjectStore((s) => s.spreadsheet)
  const openSpreadsheet = useProjectStore((s) => s.openSpreadsheet)
  const closeSpreadsheet = useProjectStore((s) => s.closeSpreadsheet)
  const denseSeeds = useProjectStore((s) => s.project.meta.denseSeeds)

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Properties (selected node) */}
      <div className="shrink-0 max-h-[36%] min-h-[4rem] flex flex-col border-b border-slate-800 overflow-hidden">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-1.5 shrink-0">
          Properties
        </div>
        <div className="min-h-0 flex-1 overflow-auto flex flex-col">
          <PropertiesPanel />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
        {/* Spreadsheet editor */}
        {spreadsheet && (
          <TensorSpreadsheet
            name={spreadsheet.name}
            mode={spreadsheet.mode}
            onClose={closeSpreadsheet}
          />
        )}

        {!spreadsheet && (
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Tensor sheet
            </div>
            <button
              type="button"
              onClick={() => openSpreadsheet('parent', 'bool')}
              className="text-[10px] text-sky-400/80 hover:text-sky-300 border border-slate-700 rounded px-1.5 py-0.5"
              title="Define a Boolean relation with the mouse"
            >
              + New sheet
            </button>
          </div>
        )}

        {!spreadsheet && (
          <p className="text-[11px] text-slate-600 leading-relaxed -mt-1">
            Define tensors like a spreadsheet: click cells to toggle facts (0/1).
            Or open <span className="text-slate-500">Sheet</span> on a matrix
            after Run.
          </p>
        )}

        {/* Matrices */}
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Matrices
        </div>
        {matrices.length === 0 ? (
          <div className="text-xs text-slate-600 italic leading-relaxed">
            No run results yet. Edit with{' '}
            <span className="text-slate-500 not-italic">+ New sheet</span> or
            load Genealogy and press Run.
          </div>
        ) : (
          matrices.map((m, i) => {
            const isDense = Boolean(denseSeeds?.[m.title])
            return (
              <MatrixView
                key={`${m.title}-${i}`}
                title={m.title}
                labels={m.labels}
                matrix={m.matrix}
                onEdit={() =>
                  openSpreadsheet(m.title, isDense ? 'dense' : 'bool')
                }
              />
            )
          })
        )}

        <div className="text-[10px] uppercase tracking-widest text-slate-500 pt-2">
          Query results
        </div>
        <QueryResults bindings={queryBindings} />
      </div>
    </div>
  )
}

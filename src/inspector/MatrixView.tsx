export interface MatrixViewProps {
  title: string
  labels: string[]
  matrix: number[][]
  highlight?: Set<string>
  /** Open spreadsheet editor when header is clicked */
  onEdit?: () => void
}

/** Map a cell value to a Tailwind background class (0 → slate, >0 → blue/violet scale). */
function cellColor(value: number, max: number): string {
  if (value === 0 || max <= 0) return 'bg-slate-800'
  const t = Math.min(1, Math.max(0, value / max))
  if (t < 0.25) return 'bg-blue-900'
  if (t < 0.5) return 'bg-blue-700'
  if (t < 0.75) return 'bg-blue-600'
  if (t < 1) return 'bg-violet-600'
  return 'bg-violet-500'
}

export function MatrixView({ title, labels, matrix, highlight, onEdit }: MatrixViewProps) {
  const n = labels.length
  const max = matrix.reduce(
    (acc, row) => Math.max(acc, ...(row.length ? row.map((v) => Math.abs(v)) : [0])),
    0,
  )

  if (n === 0) {
    return (
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-slate-300">{title}</div>
        <div className="text-[10px] text-slate-600">Empty matrix</div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-slate-300">{title}</div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[10px] text-sky-400/90 hover:text-sky-300 border border-sky-800/50 rounded px-1.5 py-0.5"
            title="Edit as spreadsheet"
          >
            Sheet
          </button>
        )}
      </div>
      <div
        className="inline-grid gap-px bg-slate-900/60 p-px rounded overflow-auto max-w-full"
        style={{
          gridTemplateColumns: `minmax(2rem, auto) repeat(${n}, minmax(1.1rem, 1.4rem))`,
        }}
      >
        {/* Corner */}
        <div className="bg-[#0c1424]" />

        {/* Column labels */}
        {labels.map((lab) => (
          <div
            key={`col-${lab}`}
            className="bg-[#0c1424] text-[9px] text-slate-500 text-center truncate px-0.5 leading-4"
            title={lab}
          >
            {lab}
          </div>
        ))}

        {/* Rows */}
        {labels.map((rowLab, r) => (
          <div key={`row-${rowLab}`} className="contents">
            <div
              className="bg-[#0c1424] text-[9px] text-slate-500 truncate pr-1 leading-4 flex items-center justify-end"
              title={rowLab}
            >
              {rowLab}
            </div>
            {Array.from({ length: n }, (_, c) => {
              const value = matrix[r]?.[c] ?? 0
              const key = `${r},${c}`
              const isHi = highlight?.has(key) ?? false
              return (
                <div
                  key={key}
                  title={`${rowLab},${labels[c]}: ${value}`}
                  className={[
                    'aspect-square min-h-[1.1rem] text-[8px] flex items-center justify-center text-slate-200/80',
                    cellColor(value, max),
                    isHi ? 'ring-1 ring-inset ring-amber-400' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {value !== 0 && n <= 12
                    ? Number.isInteger(value)
                      ? value
                      : value.toFixed(1)
                    : ''}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

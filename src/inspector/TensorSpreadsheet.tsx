import { useCallback, useEffect, useState, type KeyboardEvent } from 'react'
import {
  extractRelationSheet,
  rewriteRelationFacts,
} from '@/core/source/rewriteRelationFacts'
import { useProjectStore } from '@/store/projectStore'
import { ideRuntime } from '@/runtime/ideRuntime'

export interface TensorSpreadsheetProps {
  /** Relation / tensor name (e.g. parent, W1) */
  name: string
  mode?: 'bool' | 'dense'
  onClose?: () => void
}

/**
 * Spreadsheet-style tensor editor: click cells like Excel.
 * Boolean mode toggles facts and rewrites TensorLogic source.
 * Dense mode edits project.meta.denseSeeds + runtime seeds.
 */
export function TensorSpreadsheet({
  name,
  mode = 'bool',
  onClose,
}: TensorSpreadsheetProps) {
  const source = useProjectStore((s) => s.project.source)
  const setSource = useProjectStore((s) => s.setSource)
  const denseSeeds = useProjectStore((s) => s.project.meta.denseSeeds)
  const setStatus = useProjectStore((s) => s.setStatus)
  const appendConsole = useProjectStore((s) => s.appendConsole)
  const setDenseSeed = useProjectStore((s) => s.setDenseSeed)

  const [relName, setRelName] = useState(name)
  const [labels, setLabels] = useState<string[]>([])
  const [matrix, setMatrix] = useState<number[][]>([])
  const [editHeader, setEditHeader] = useState<{
    kind: 'row' | 'col'
    index: number
  } | null>(null)
  const [headerDraft, setHeaderDraft] = useState('')
  const [denseEdit, setDenseEdit] = useState<{ r: number; c: number } | null>(
    null,
  )
  const [denseDraft, setDenseDraft] = useState('')

  // Load sheet when name/source changes (bool) or dense seeds
  useEffect(() => {
    setRelName(name)
    if (mode === 'bool') {
      const sheet = extractRelationSheet(source, name)
      setLabels(sheet.labels)
      setMatrix(sheet.matrix.map((row) => [...row]))
    } else {
      const seed = denseSeeds?.[name]
      if (seed && seed.shape.length === 1) {
        const rows = seed.shape[0]
        setLabels(Array.from({ length: rows }, (_, i) => String(i)))
        setMatrix(
          Array.from({ length: rows }, (_, r) => [seed.data[r] ?? 0]),
        )
      } else if (seed && seed.shape.length >= 2) {
        const rows = seed.shape[0]
        const cols = seed.shape[1]
        setLabels(Array.from({ length: cols }, (_, i) => String(i)))
        setMatrix(
          Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => seed.data[r * cols + c] ?? 0),
          ),
        )
      } else {
        const n = 3
        setLabels(Array.from({ length: n }, (_, i) => String(i)))
        setMatrix(Array.from({ length: n }, () => Array(n).fill(0)))
      }
    }
  }, [name, mode, source, denseSeeds])

  const applyBool = useCallback(
    (nextLabels: string[], nextMatrix: number[][], relation = relName) => {
      const nextSource = rewriteRelationFacts(
        source,
        relation,
        nextLabels,
        nextMatrix,
      )
      setSource(nextSource)
      setStatus(`Spreadsheet → ${relation} (${countOnes(nextMatrix)} facts)`)
      appendConsole(
        `Updated relation ${relation} from spreadsheet (${countOnes(nextMatrix)} facts)`,
      )
    },
    [source, relName, setSource, setStatus, appendConsole],
  )

  const applyDense = useCallback(
    (nextMatrix: number[][]) => {
      const rows = nextMatrix.length
      const cols = nextMatrix[0]?.length ?? 0
      const finalShape = cols === 1 ? [rows] : [rows, cols]
      const finalData =
        cols === 1
          ? nextMatrix.map((r) => r[0] ?? 0)
          : nextMatrix.flatMap((r) => r)

      setDenseSeed(relName, { shape: finalShape, data: finalData })
      ideRuntime.seedDense(relName, finalShape, finalData)
      setStatus(`Dense tensor ${relName} [${finalShape.join('×')}] updated`)
      appendConsole(`Seeded dense ${relName} from spreadsheet`)
    },
    [relName, setDenseSeed, setStatus, appendConsole],
  )

  const toggleCell = (r: number, c: number) => {
    if (mode === 'dense') return
    const next = matrix.map((row) => [...row])
    next[r][c] = next[r][c] ? 0 : 1
    setMatrix(next)
    applyBool(labels, next)
  }

  const startDenseEdit = (r: number, c: number) => {
    if (mode !== 'dense') return
    setDenseEdit({ r, c })
    setDenseDraft(String(matrix[r]?.[c] ?? 0))
  }

  const commitDenseEdit = () => {
    if (!denseEdit) return
    const v = Number(denseDraft)
    if (!Number.isFinite(v)) {
      setDenseEdit(null)
      return
    }
    const next = matrix.map((row) => [...row])
    next[denseEdit.r][denseEdit.c] = v
    setMatrix(next)
    setDenseEdit(null)
    applyDense(next)
  }

  const addRow = () => {
    const n = labels.length + 1
    const lab = mode === 'bool' ? nextSymbol(labels) : String(labels.length)
    const nextLabels = [...labels, lab]
    const nextMatrix = [
      ...matrix.map((row) => [...row, 0]),
      Array.from({ length: n }, () => 0),
    ]
    setLabels(nextLabels)
    setMatrix(nextMatrix)
    if (mode === 'bool') applyBool(nextLabels, nextMatrix)
    else applyDense(nextMatrix)
  }

  const addCol = () => {
    // For square bool relations, addRow already expands both; for dense rectangular expand cols
    if (mode === 'bool') {
      addRow()
      return
    }
    const nextLabels = [...labels, String(labels.length)]
    const nextMatrix = matrix.map((row) => [...row, 0])
    setLabels(nextLabels)
    setMatrix(nextMatrix)
    applyDense(nextMatrix)
  }

  const renameHeader = (_kind: 'row' | 'col', index: number, value: string) => {
    const v = value.trim()
    if (!v || mode === 'dense') {
      setEditHeader(null)
      return
    }
    // For square bool domain, row and col headers share the same labels array
    const nextLabels = [...labels]
    if (nextLabels.includes(v) && nextLabels[index] !== v) {
      setStatus(`Label "${v}" already exists`)
      setEditHeader(null)
      return
    }
    nextLabels[index] = v
    setLabels(nextLabels)
    setEditHeader(null)
    applyBool(nextLabels, matrix)
  }

  const nRows = matrix.length
  const nCols = matrix[0]?.length ?? 0
  const colLabels =
    mode === 'bool'
      ? labels
      : labels.length === nCols
        ? labels
        : Array.from({ length: nCols }, (_, i) => labels[i] ?? String(i))
  const rowLabels =
    mode === 'bool'
      ? labels
      : Array.from({ length: nRows }, (_, i) =>
          mode === 'dense' && nCols === 1 ? labels[i] ?? String(i) : String(i),
        )

  return (
    <div className="rounded-lg border border-sky-800/50 bg-[#0a1628] p-3 space-y-2 shadow-lg shadow-sky-950/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-sky-500/90 shrink-0">
            Spreadsheet
          </span>
          <input
            value={relName}
            onChange={(e) => setRelName(e.target.value)}
            onBlur={() => {
              if (!relName.trim()) setRelName(name)
            }}
            className="font-mono text-xs bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5 text-sky-200 w-28 focus:outline-none focus:border-sky-600"
            title="Tensor / relation name"
          />
          <span className="text-[10px] text-slate-500">
            {mode === 'bool' ? 'click = toggle 0/1' : 'click = edit number'}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-700"
          >
            Close
          </button>
        )}
      </div>

      <div className="overflow-auto max-h-[min(50vh,360px)]">
        <table className="border-collapse text-[11px] font-mono select-none">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-[#0a1628] border border-slate-800 w-16 h-7" />
              {colLabels.map((lab, c) => (
                <th
                  key={`c-${c}`}
                  className="border border-slate-800 bg-slate-900/50 px-1 h-7 min-w-[2.25rem] text-slate-400 font-normal cursor-pointer hover:bg-slate-800"
                  onDoubleClick={() => {
                    if (mode !== 'bool') return
                    setEditHeader({ kind: 'col', index: c })
                    setHeaderDraft(lab)
                  }}
                  title={
                    mode === 'bool'
                      ? 'Double-click to rename domain'
                      : undefined
                  }
                >
                  {editHeader?.kind === 'col' && editHeader.index === c ? (
                    <input
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => renameHeader('col', c, headerDraft)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          renameHeader('col', c, headerDraft)
                        if (e.key === 'Escape') setEditHeader(null)
                      }}
                      className="w-full bg-slate-950 border border-sky-700 rounded px-0.5 text-center text-sky-200"
                    />
                  ) : (
                    <span className="truncate block max-w-[4rem]">{lab}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, r) => (
              <tr key={`r-${r}`}>
                <th
                  className="sticky left-0 z-10 border border-slate-800 bg-slate-900/50 px-1 h-7 min-w-[2.5rem] text-slate-400 font-normal text-right cursor-pointer hover:bg-slate-800"
                  onDoubleClick={() => {
                    if (mode !== 'bool') return
                    setEditHeader({ kind: 'row', index: r })
                    setHeaderDraft(rowLabels[r] ?? String(r))
                  }}
                  title={
                    mode === 'bool'
                      ? 'Double-click to rename domain'
                      : undefined
                  }
                >
                  {editHeader?.kind === 'row' && editHeader.index === r ? (
                    <input
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => renameHeader('row', r, headerDraft)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')
                          renameHeader('row', r, headerDraft)
                        if (e.key === 'Escape') setEditHeader(null)
                      }}
                      className="w-full bg-slate-950 border border-sky-700 rounded px-0.5 text-center text-sky-200"
                    />
                  ) : (
                    <span className="truncate block">{rowLabels[r]}</span>
                  )}
                </th>
                {row.map((value, c) => {
                  const active = value !== 0
                  const editing =
                    denseEdit?.r === r && denseEdit?.c === c
                  return (
                    <td
                      key={`cell-${r}-${c}`}
                      onClick={() =>
                        mode === 'bool' ? toggleCell(r, c) : startDenseEdit(r, c)
                      }
                      className={[
                        'border border-slate-800 h-7 min-w-[2.25rem] text-center cursor-pointer transition-colors',
                        active
                          ? 'bg-blue-700/90 text-white hover:bg-blue-600'
                          : 'bg-slate-900/40 text-slate-600 hover:bg-slate-800',
                      ].join(' ')}
                      title={
                        mode === 'bool'
                          ? `${rowLabels[r]}, ${colLabels[c]} = ${value} (click to toggle)`
                          : `${r},${c} = ${value} (click to edit)`
                      }
                    >
                      {editing ? (
                        <input
                          autoFocus
                          value={denseDraft}
                          onChange={(e) => setDenseDraft(e.target.value)}
                          onBlur={commitDenseEdit}
                          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                            if (e.key === 'Enter') commitDenseEdit()
                            if (e.key === 'Escape') setDenseEdit(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full h-full bg-slate-950 text-sky-200 text-center text-[11px] outline-none"
                        />
                      ) : mode === 'bool' ? (
                        active ? (
                          '1'
                        ) : (
                          ''
                        )
                      ) : active || value !== 0 ? (
                        Number.isInteger(value) ? (
                          value
                        ) : (
                          value.toFixed(2)
                        )
                      ) : (
                        '0'
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="text-[11px] px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-sky-700"
        >
          + {mode === 'bool' ? 'Entity (row/col)' : 'Row'}
        </button>
        {mode === 'dense' && (
          <button
            type="button"
            onClick={addCol}
            className="text-[11px] px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            + Column
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (mode === 'bool') applyBool(labels, matrix)
            else applyDense(matrix)
          }}
          className="text-[11px] px-2 py-1 rounded border border-emerald-800/60 text-emerald-300/90 hover:bg-emerald-950/40"
        >
          Apply
        </button>
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed">
        {mode === 'bool' ? (
          <>
            Mouse: <strong className="text-slate-500">click</strong> a cell to
            set/clear a fact. Double-click headers to rename domain symbols.
            Changes rewrite{' '}
            <code className="text-slate-500">{relName}(…).</code> in source.
          </>
        ) : (
          <>
            Mouse: <strong className="text-slate-500">click</strong> a cell to
            type a number. Values update dense seeds for{' '}
            <code className="text-slate-500">{relName}</code>.
          </>
        )}
      </p>
    </div>
  )
}

function countOnes(m: number[][]): number {
  let n = 0
  for (const row of m) for (const v of row) if (v) n++
  return n
}

function nextSymbol(existing: string[]): string {
  const base = 'e'
  let i = existing.length + 1
  while (existing.includes(`${base}${i}`)) i++
  return `${base}${i}`
}

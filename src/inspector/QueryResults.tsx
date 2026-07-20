export interface QueryResultsProps {
  bindings: Record<string, string>[]
}

export function QueryResults({ bindings }: QueryResultsProps) {
  if (bindings.length === 0) {
    return (
      <div className="text-xs text-slate-600 italic px-0.5">No query bindings</div>
    )
  }

  const keys = Array.from(
    bindings.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  )

  return (
    <div className="overflow-auto max-h-40">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-800">
            {keys.map((k) => (
              <th key={k} className="py-1 pr-2 font-medium sticky top-0 bg-[#0c1424]">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bindings.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-800/60 text-slate-300 font-mono"
            >
              {keys.map((k) => (
                <td key={k} className="py-0.5 pr-2">
                  {row[k] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

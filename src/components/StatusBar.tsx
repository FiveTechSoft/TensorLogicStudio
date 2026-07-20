import { useProjectStore } from '@/store/projectStore'

export function StatusBar() {
  const status = useProjectStore((s) => s.status)
  const lastRun = useProjectStore((s) => s.lastRun)
  const parseError = useProjectStore((s) => s.parseError)
  const graphStale = useProjectStore((s) => s.graphStale)

  const readyLabel = parseError ? 'Parse error' : graphStale ? 'Graph stale' : 'Ready'
  const readyClass = parseError
    ? 'text-rose-400/90'
    : graphStale
      ? 'text-amber-400/90'
      : 'text-emerald-400/90 font-medium'

  return (
    <footer className="flex items-center justify-between gap-3 px-3 py-1 border-t border-slate-800 bg-[#0c1424] text-[11px] shrink-0">
      <div className="flex items-center gap-3 text-slate-500 min-w-0">
        <span title="Compute backend">CPU</span>
        <span className="text-slate-700">|</span>
        <span title="Application version">v0.1.0</span>
        {lastRun && (
          <>
            <span className="text-slate-700">|</span>
            <span
              className="text-slate-400 truncate"
              title="Last run summary"
            >
              {lastRun.fixpoint ? 'Fixpoint' : 'No fixpoint'}
              {' · '}
              {lastRun.iterations} iter
              {lastRun.entityCount > 0 && ` · ${lastRun.entityCount} entities`}
              {lastRun.ms != null && ` · ${lastRun.ms.toFixed(1)} ms`}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {lastRun?.successfulDeduction && (
          <span
            className="text-emerald-400 font-semibold tracking-wide"
            title={`${lastRun.bindingCount} query binding(s)`}
          >
            SUCCESSFUL DEDUCTION
          </span>
        )}
        <span className="text-slate-400 max-w-[40vw] truncate" title={status}>
          {status}
        </span>
        <span className={readyClass}>{readyLabel}</span>
      </div>
    </footer>
  )
}

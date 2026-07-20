import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'

export function ConsolePanel() {
  const consoleLines = useProjectStore((s) => s.consoleLines)
  const [open, setOpen] = useState(true)

  return (
    <div className="border-t border-slate-800 bg-[#0a101c] shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 transition-colors"
      >
        <span className="text-slate-600">{open ? '▼' : '▶'}</span>
        Console
        {consoleLines.length > 0 && (
          <span className="normal-case tracking-normal text-slate-600">
            ({consoleLines.length})
          </span>
        )}
      </button>
      {open && (
        <div className="h-28 overflow-auto px-3 pb-2 font-mono text-xs text-slate-400">
          {consoleLines.length === 0 ? (
            <div className="text-slate-600 italic leading-relaxed py-1">
              No console output yet. Run a program or load an example to see
              traces, status, and diagnostics here.
            </div>
          ) : (
            consoleLines.map((line, i) => (
              <div key={i} className="leading-5 whitespace-pre-wrap">
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

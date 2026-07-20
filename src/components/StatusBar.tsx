import { useProjectStore } from '@/store/projectStore'

export function StatusBar() {
  const status = useProjectStore((s) => s.status)

  return (
    <footer className="flex items-center justify-between px-3 py-1 border-t border-slate-800 bg-[#0c1424] text-[11px] shrink-0">
      <div className="flex items-center gap-3 text-slate-500">
        <span>CPU</span>
        <span className="text-slate-700">|</span>
        <span>v0.1.0</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-slate-400">{status}</span>
        <span className="text-emerald-400/90 font-medium">Ready</span>
      </div>
    </footer>
  )
}

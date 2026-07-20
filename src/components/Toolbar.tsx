import { useProjectStore } from '@/store/projectStore'

const btnClass =
  'px-3 py-1 rounded border border-slate-700 bg-slate-900/60 text-slate-200 text-xs font-medium hover:bg-slate-800 hover:border-slate-600 active:bg-slate-700 transition-colors'

export function Toolbar() {
  const projectName = useProjectStore((s) => s.project.name)

  return (
    <header className="flex items-center gap-4 px-4 py-2 border-b border-slate-800 bg-[#0c1424] shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sky-400 font-semibold tracking-widest text-sm uppercase whitespace-nowrap">
          TensorLogic Studio
        </h1>
        <span className="text-slate-600">|</span>
        <span className="text-slate-400 text-sm truncate" title={projectName}>
          {projectName}
        </span>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <button type="button" className={btnClass} onClick={() => {}}>
          Run
        </button>
        <button type="button" className={btnClass} onClick={() => {}}>
          Step
        </button>
        <button type="button" className={btnClass} onClick={() => {}}>
          Stop
        </button>
        <span className="w-px h-4 bg-slate-700 mx-1" aria-hidden />
        <button type="button" className={btnClass} onClick={() => {}}>
          Examples
        </button>
        <button type="button" className={btnClass} onClick={() => {}}>
          Save
        </button>
        <button type="button" className={btnClass} onClick={() => {}}>
          Load
        </button>
      </div>
    </header>
  )
}

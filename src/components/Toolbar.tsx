import { useProjectStore } from '@/store/projectStore'
import {
  runAndPublish,
  stepAndPublish,
  stopRuntime,
  type InspectorActions,
} from '@/runtime/ideRuntime'

const btnClass =
  'px-3 py-1 rounded border border-slate-700 bg-slate-900/60 text-slate-200 text-xs font-medium hover:bg-slate-800 hover:border-slate-600 active:bg-slate-700 transition-colors'

function inspectorActionsFromStore(): InspectorActions {
  const s = useProjectStore.getState()
  return {
    setMatrices: s.setMatrices,
    setQueryBindings: s.setQueryBindings,
    setTraces: s.setTraces,
    setStatus: s.setStatus,
    appendConsole: s.appendConsole,
  }
}

export function Toolbar() {
  const projectName = useProjectStore((s) => s.project.name)

  const handleRun = () => {
    const s = useProjectStore.getState()
    try {
      s.setParseError(null)
      runAndPublish(s.project.source, inspectorActionsFromStore())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      s.setParseError(msg)
    }
  }

  const handleStep = () => {
    const s = useProjectStore.getState()
    const actions = inspectorActionsFromStore()
    try {
      s.setParseError(null)
      stepAndPublish(s.project.source, actions)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      s.setParseError(msg)
      actions.setStatus(`Error: ${msg}`)
      actions.appendConsole(`Error: ${msg}`)
    }
  }

  const handleStop = () => {
    stopRuntime(inspectorActionsFromStore())
  }

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
        <button type="button" className={btnClass} onClick={handleRun}>
          Run
        </button>
        <button type="button" className={btnClass} onClick={handleStep}>
          Step
        </button>
        <button type="button" className={btnClass} onClick={handleStop}>
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

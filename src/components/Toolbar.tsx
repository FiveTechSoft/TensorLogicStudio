import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { genealogyProject } from '@/examples/genealogy'
import { mlpProject } from '@/examples/mlp'
import {
  loadProjectIntoIde,
  runAndPublish,
  stepAndPublish,
  stopRuntime,
  type InspectorActions,
} from '@/runtime/ideRuntime'
import { downloadProject, openProjectFile, saveSession } from '@/persistence/fileIo'
import type { Project } from '@/types/project'

const btnClass =
  'px-3 py-1 rounded border border-slate-700 bg-slate-900/60 text-slate-200 text-xs font-medium hover:bg-slate-800 hover:border-slate-600 active:bg-slate-700 transition-colors'

const menuItemClass =
  'w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition-colors'

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
  const [examplesOpen, setExamplesOpen] = useState(false)
  const examplesRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!examplesOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!examplesRef.current?.contains(e.target as Node)) {
        setExamplesOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [examplesOpen])

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

  const handleSave = () => {
    const project = useProjectStore.getState().project
    downloadProject(project)
    saveSession(project)
  }

  const handleLoadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Allow re-selecting the same file later.
    e.target.value = ''
    if (!file) return
    try {
      const project = await openProjectFile(file)
      loadProjectIntoIde(project)
      saveSession(project)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const s = useProjectStore.getState()
      s.setParseError(msg)
      s.setStatus(`Load failed: ${msg}`)
      s.appendConsole(`Load failed: ${msg}`)
    }
  }

  const loadExample = (project: Project) => {
    // Clone so loaders never mutate the module constant.
    loadProjectIntoIde(structuredClone(project))
    setExamplesOpen(false)
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
        <div className="relative" ref={examplesRef}>
          <button
            type="button"
            className={btnClass}
            aria-expanded={examplesOpen}
            aria-haspopup="menu"
            onClick={() => setExamplesOpen((o) => !o)}
          >
            Examples
          </button>
          {examplesOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded border border-slate-700 bg-[#0c1424] shadow-lg shadow-black/40 py-1"
            >
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => loadExample(genealogyProject)}
              >
                Genealogy
              </button>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => loadExample(mlpProject)}
              >
                MLP
              </button>
            </div>
          )}
        </div>
        <button type="button" className={btnClass} onClick={handleSave}>
          Save
        </button>
        <button type="button" className={btnClass} onClick={handleLoadClick}>
          Load
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.tls.json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </header>
  )
}

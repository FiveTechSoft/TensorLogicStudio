import { useEffect, type ReactNode } from 'react'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'
import { ConsolePanel } from './ConsolePanel'
import { CodeEditor } from '@/editor/CodeEditor'
import { graphFromSource } from '@/editor/syncFromSource'
import { GraphCanvas } from '@/graph/GraphCanvas'
import { InspectorPanel } from '@/inspector/InspectorPanel'
import { useProjectStore } from '@/store/projectStore'
import { wireEventEdges } from '@/core/events/wireGraph'
import type { GraphNode } from '@/types/project'
import {
  ideBus,
  ideRuntime,
  publishInspector,
  runAndPublish,
  stepAndPublish,
  stopRuntime,
  type InspectorActions,
} from '@/runtime/ideRuntime'

function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-800/80 shrink-0">
      {children}
    </div>
  )
}

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

/** Build Visual Café action map for event-edge targets. */
function buildEventActions(nodes: GraphNode[]): Record<string, Record<string, () => void>> {
  const run = () => {
    const s = useProjectStore.getState()
    try {
      s.setParseError(null)
      runAndPublish(s.project.source, inspectorActionsFromStore())
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      s.setParseError(msg)
    }
  }

  const step = () => {
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

  const stop = () => {
    stopRuntime(inspectorActionsFromStore())
  }

  const runtimeActions = { run, step, stop }
  const actions: Record<string, Record<string, () => void>> = {
    runtime: runtimeActions,
  }

  for (const n of nodes) {
    if (n.kind === 'run' || n.kind === 'button' || n.kind === 'stepIter') {
      actions[n.id] = { ...runtimeActions }
    } else if (n.kind === 'matrixView') {
      actions[n.id] = {
        refresh: () => {
          publishInspector(ideRuntime, inspectorActionsFromStore())
        },
        highlight: () => {
          useProjectStore.getState().appendConsole('highlight')
        },
      }
    } else if (n.kind === 'console') {
      actions[n.id] = {
        log: () => {
          useProjectStore.getState().appendConsole('event')
        },
      }
    } else if (n.kind === 'highlight') {
      actions[n.id] = {
        highlight: () => {
          useProjectStore.getState().appendConsole('highlight')
        },
      }
    }
  }

  return actions
}

/** Debounced source → graph dual-sync (300ms). */
function useSourceToGraphSync() {
  const source = useProjectStore((s) => s.project.source)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const {
        project,
        setGraph,
        setParseError,
        setGraphStale,
      } = useProjectStore.getState()
      const result = graphFromSource(project.source, project.graph)
      setGraph(result.nodes, result.edges)
      if (result.error) {
        setParseError(result.error)
        setGraphStale(true)
      } else {
        setParseError(null)
        setGraphStale(false)
      }
    }, 300)
    return () => window.clearTimeout(handle)
  }, [source])
}

/** Rewire Visual Café event edges whenever the graph changes. */
function useEventEdgeWiring() {
  const nodes = useProjectStore((s) => s.project.graph.nodes)
  const edges = useProjectStore((s) => s.project.graph.edges)

  useEffect(() => {
    const actions = buildEventActions(nodes)
    return wireEventEdges(edges, nodes, ideBus, actions)
  }, [nodes, edges])
}

export function AppShell() {
  useSourceToGraphSync()
  useEventEdgeWiring()

  return (
    <div className="h-full flex flex-col bg-[#0b1220] text-slate-200">
      <Toolbar />

      <div
        className="flex-1 grid min-h-0"
        style={{ gridTemplateColumns: '28% 44% 28%' }}
      >
        <section className="border-r border-slate-800 min-h-0 flex flex-col bg-[#0c1424]/80">
          <CodeEditor />
        </section>

        <section className="border-r border-slate-800 min-h-0 flex flex-col">
          <PaneHeader>Tensor Graph</PaneHeader>
          <GraphCanvas />
        </section>

        <section className="min-h-0 flex flex-col bg-[#0c1424]/80">
          <PaneHeader>Inspector</PaneHeader>
          <InspectorPanel />
        </section>
      </div>

      <ConsolePanel />
      <StatusBar />
    </div>
  )
}

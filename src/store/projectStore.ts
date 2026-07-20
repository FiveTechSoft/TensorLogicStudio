import { create } from 'zustand'
import type { Project, GraphNode, GraphEdge } from '@/types/project'
import { emptyProject } from '@/types/project'
import type { TraceEvent } from '@/types/trace'

interface ProjectState {
  project: Project
  sourceDirty: boolean
  graphStale: boolean
  parseError: string | null
  traces: TraceEvent[]
  consoleLines: string[]
  status: string
  setSource: (source: string) => void
  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void
  loadProject: (p: Project) => void
  setSelected: (id?: string) => void
  appendConsole: (line: string) => void
  setTraces: (t: TraceEvent[]) => void
  setStatus: (s: string) => void
  setParseError: (e: string | null) => void
  setGraphStale: (v: boolean) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: emptyProject('untitled'),
  sourceDirty: false,
  graphStale: false,
  parseError: null,
  traces: [],
  consoleLines: [],
  status: 'Ready',
  setSource: (source) =>
    set((s) => ({
      project: { ...s.project, source, meta: { ...s.project.meta, updatedAt: new Date().toISOString() } },
      sourceDirty: true,
    })),
  setGraph: (nodes, edges) =>
    set((s) => ({
      project: { ...s.project, graph: { nodes, edges } },
    })),
  loadProject: (p) =>
    set({
      project: p,
      sourceDirty: false,
      graphStale: false,
      parseError: null,
      traces: [],
      consoleLines: [`Loaded ${p.name}`],
      status: 'Ready',
    }),
  setSelected: (id) =>
    set((s) => ({ project: { ...s.project, ui: { ...s.project.ui, selectedId: id } } })),
  appendConsole: (line) => set((s) => ({ consoleLines: [...s.consoleLines, line] })),
  setTraces: (traces) => set({ traces }),
  setStatus: (status) => set({ status }),
  setParseError: (parseError) => set({ parseError }),
  setGraphStale: (graphStale) => set({ graphStale }),
}))

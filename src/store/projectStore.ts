import { create } from 'zustand'
import type { Project, GraphNode, GraphEdge } from '@/types/project'
import { emptyProject } from '@/types/project'
import type { TraceEvent } from '@/types/trace'

export interface MatrixEntry {
  title: string
  labels: string[]
  matrix: number[][]
}

/** Snapshot of the most recent Run / Step for the status bar. */
export interface LastRunInfo {
  fixpoint: boolean
  iterations: number
  ms?: number
  entityCount: number
  bindingCount: number
  /** True when a query returned one or more bindings (successful deduction). */
  successfulDeduction: boolean
}

interface ProjectState {
  project: Project
  sourceDirty: boolean
  graphStale: boolean
  parseError: string | null
  traces: TraceEvent[]
  consoleLines: string[]
  status: string
  matrices: MatrixEntry[]
  queryBindings: Record<string, string>[]
  lastRun: LastRunInfo | null
  setSource: (source: string) => void
  /** Update source from the graph without rebuilding the canvas (two-way lock). */
  setSourceFromGraph: (source: string) => void
  /** When true, next source→graph sync is skipped once. */
  skipNextSourceToGraph: boolean
  setGraph: (nodes: GraphNode[], edges: GraphEdge[]) => void
  loadProject: (p: Project) => void
  setSelected: (id?: string) => void
  appendConsole: (line: string) => void
  setTraces: (t: TraceEvent[]) => void
  setStatus: (s: string) => void
  setParseError: (e: string | null) => void
  setGraphStale: (v: boolean) => void
  setMatrices: (m: MatrixEntry[]) => void
  setQueryBindings: (b: Record<string, string>[]) => void
  setLastRun: (info: LastRunInfo | null) => void
  setDenseSeed: (
    name: string,
    seed: { shape: number[]; data: number[] },
  ) => void
  /** Relation/tensor currently open in spreadsheet editor */
  spreadsheet: { name: string; mode: 'bool' | 'dense' } | null
  openSpreadsheet: (name: string, mode?: 'bool' | 'dense') => void
  closeSpreadsheet: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: emptyProject('untitled'),
  sourceDirty: false,
  graphStale: false,
  parseError: null,
  traces: [],
  consoleLines: [],
  status: 'Ready',
  matrices: [],
  queryBindings: [],
  lastRun: null,
  skipNextSourceToGraph: false,
  setSource: (source) =>
    set((s) => ({
      project: { ...s.project, source, meta: { ...s.project.meta, updatedAt: new Date().toISOString() } },
      sourceDirty: true,
      skipNextSourceToGraph: false,
    })),
  setSourceFromGraph: (source) =>
    set((s) => ({
      project: {
        ...s.project,
        source,
        meta: { ...s.project.meta, updatedAt: new Date().toISOString() },
      },
      sourceDirty: true,
      skipNextSourceToGraph: true,
      graphStale: false,
      parseError: null,
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
      matrices: [],
      queryBindings: [],
      lastRun: null,
      spreadsheet: null,
      skipNextSourceToGraph: false,
    }),
  setSelected: (id) =>
    set((s) => ({ project: { ...s.project, ui: { ...s.project.ui, selectedId: id } } })),
  appendConsole: (line) => set((s) => ({ consoleLines: [...s.consoleLines, line] })),
  setTraces: (traces) => set({ traces }),
  setStatus: (status) => set({ status }),
  setParseError: (parseError) => set({ parseError }),
  setGraphStale: (graphStale) => set({ graphStale }),
  setMatrices: (matrices) => set({ matrices }),
  setQueryBindings: (queryBindings) => set({ queryBindings }),
  setLastRun: (lastRun) => set({ lastRun }),
  setDenseSeed: (name, seed) =>
    set((s) => ({
      project: {
        ...s.project,
        meta: {
          ...s.project.meta,
          updatedAt: new Date().toISOString(),
          denseSeeds: {
            ...s.project.meta.denseSeeds,
            [name]: seed,
          },
        },
      },
    })),
  spreadsheet: null,
  openSpreadsheet: (name, mode = 'bool') =>
    set({ spreadsheet: { name, mode } }),
  closeSpreadsheet: () => set({ spreadsheet: null }),
}))

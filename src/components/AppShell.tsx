import type { ReactNode } from 'react'
import { Toolbar } from './Toolbar'
import { StatusBar } from './StatusBar'
import { ConsolePanel } from './ConsolePanel'
import { CodeEditor } from '@/editor/CodeEditor'

function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-800/80 shrink-0">
      {children}
    </div>
  )
}

function PanePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm">
      {label}
    </div>
  )
}

export function AppShell() {
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
          <PanePlaceholder label="Graph canvas" />
        </section>

        <section className="min-h-0 flex flex-col bg-[#0c1424]/80">
          <PaneHeader>Inspector</PaneHeader>
          <PanePlaceholder label="Properties & matrices" />
        </section>
      </div>

      <ConsolePanel />
      <StatusBar />
    </div>
  )
}

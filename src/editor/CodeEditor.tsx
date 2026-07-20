import Editor from '@monaco-editor/react'
import { useProjectStore } from '@/store/projectStore'

export function CodeEditor() {
  const source = useProjectStore((s) => s.project.source)
  const setSource = useProjectStore((s) => s.setSource)
  const parseError = useProjectStore((s) => s.parseError)

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 px-3 py-2 shrink-0">
        Declarative Rules
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          theme="vs-dark"
          defaultLanguage="plaintext"
          value={source}
          onChange={(v) => setSource(v ?? '')}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            wordWrap: 'on',
            automaticLayout: true,
          }}
        />
      </div>
      {parseError && (
        <div className="text-xs text-red-400 px-2 py-1 border-t border-slate-800 shrink-0">{parseError}</div>
      )}
    </div>
  )
}

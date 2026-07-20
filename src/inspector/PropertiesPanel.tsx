import { useEffect, useState, type KeyboardEvent } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { updateStmtLabel } from '@/editor/syncToSource'

export function PropertiesPanel() {
  const selectedId = useProjectStore((s) => s.project.ui.selectedId)
  const nodes = useProjectStore((s) => s.project.graph.nodes)
  const source = useProjectStore((s) => s.project.source)
  const setSource = useProjectStore((s) => s.setSource)
  const setStatus = useProjectStore((s) => s.setStatus)
  const openSpreadsheet = useProjectStore((s) => s.openSpreadsheet)

  const node = selectedId
    ? nodes.find((n) => n.id === selectedId)
    : undefined

  const [labelDraft, setLabelDraft] = useState('')

  useEffect(() => {
    setLabelDraft(node?.label ?? '')
  }, [node?.id, node?.label])

  if (!node) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-600 text-xs px-4 text-center leading-relaxed">
        Select a graph node to inspect its kind, AST id, and editable label.
      </div>
    )
  }

  const canEditAst = Boolean(node.astId)

  const commitLabel = () => {
    const next = labelDraft.trim()
    if (!next || next === node.label) return

    if (node.astId) {
      const rewritten = updateStmtLabel(source, node.astId, next)
      if (rewritten != null) {
        setSource(rewritten)
        setStatus(`Updated ${node.kind} label → ${next}`)
        return
      }
      setStatus('Could not update source for this node')
      setLabelDraft(node.label)
      return
    }

    // UI / non-AST nodes: label is display-only for MVP
    setStatus('Label edit requires an AST-linked node (rule/equation/query)')
    setLabelDraft(node.label)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setLabelDraft(node.label)
      e.currentTarget.blur()
    }
  }

  return (
    <div className="flex-1 overflow-auto p-3 space-y-3 text-sm">
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Selected
        </div>
        <div className="font-mono text-xs text-slate-300 break-all">{node.id}</div>
      </div>

      <div className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-2 items-center">
        <span className="text-slate-500 text-xs">Kind</span>
        <span className="text-sky-300/90 text-xs font-medium">{node.kind}</span>

        <span className="text-slate-500 text-xs">AST id</span>
        <span className="font-mono text-[11px] text-slate-400 break-all">
          {node.astId ?? '—'}
        </span>

        <label htmlFor="prop-label" className="text-slate-500 text-xs">
          Label
        </label>
        <input
          id="prop-label"
          type="text"
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={onKeyDown}
          disabled={!canEditAst}
          title={
            canEditAst
              ? 'Edit and press Enter / blur to rewrite source'
              : 'Only AST-linked nodes support label rewrite'
          }
          className="w-full rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-100
            focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-700/50
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {(node.kind === 'relation' || node.kind === 'tensor') && (
        <button
          type="button"
          onClick={() => {
            openSpreadsheet(
              node.label,
              node.kind === 'tensor' ? 'dense' : 'bool',
            )
            setStatus(`Spreadsheet: ${node.label}`)
          }}
          className="w-full text-left text-xs px-2 py-1.5 rounded border border-sky-800/60 bg-sky-950/30 text-sky-300 hover:bg-sky-950/60"
        >
          Edit as spreadsheet (mouse)
        </button>
      )}

      {canEditAst && (
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Changing the label rewrites the linked statement in TensorLogic source
          (rule head, equation LHS, or query goal).
        </p>
      )}
    </div>
  )
}

import { parse } from '@/core/parser/parse'
import { printProgram } from '@/editor/syncToSource'
import type { Fact, Stmt } from '@/types/ast'

/**
 * Build a Boolean adjacency matrix for a binary relation from source facts.
 * Domain = sorted unique symbols appearing in those facts (or `seedLabels` if given).
 */
export function extractRelationSheet(
  source: string,
  relation: string,
  seedLabels?: string[],
): { labels: string[]; matrix: number[][] } {
  let facts: Fact[] = []
  try {
    const prog = parse(source)
    facts = prog.stmts.filter(
      (s): s is Fact => s.kind === 'fact' && s.relation === relation && s.args.length === 2,
    )
  } catch {
    facts = []
  }

  const labelSet = new Set<string>(seedLabels ?? [])
  for (const f of facts) {
    labelSet.add(f.args[0])
    labelSet.add(f.args[1])
  }

  const labels =
    seedLabels && seedLabels.length > 0
      ? [...seedLabels]
      : [...labelSet].sort((a, b) => a.localeCompare(b))

  // Ensure all fact symbols appear even if seedLabels omitted some
  if (seedLabels && seedLabels.length > 0) {
    for (const f of facts) {
      if (!labels.includes(f.args[0])) labels.push(f.args[0])
      if (!labels.includes(f.args[1])) labels.push(f.args[1])
    }
  }

  if (labels.length === 0) {
    return {
      labels: ['a', 'b', 'c', 'd'],
      matrix: zeros(4),
    }
  }

  const index = new Map(labels.map((l, i) => [l, i]))
  const n = labels.length
  const matrix = zeros(n)
  for (const f of facts) {
    const r = index.get(f.args[0])
    const c = index.get(f.args[1])
    if (r !== undefined && c !== undefined) matrix[r][c] = 1
  }
  return { labels, matrix }
}

function zeros(n: number): number[][] {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
}

/**
 * Replace all facts for `relation` with cells that are non-zero in the sheet.
 * Other statements (rules, queries, other facts) are preserved.
 */
export function rewriteRelationFacts(
  source: string,
  relation: string,
  labels: string[],
  matrix: number[][],
): string {
  let stmts: Stmt[] = []
  try {
    stmts = parse(source).stmts
  } catch {
    stmts = []
  }

  const kept = stmts.filter(
    (s) => !(s.kind === 'fact' && s.relation === relation),
  )

  let factIdx = 0
  const newFacts: Fact[] = []
  for (let r = 0; r < labels.length; r++) {
    for (let c = 0; c < labels.length; c++) {
      if ((matrix[r]?.[c] ?? 0) !== 0) {
        newFacts.push({
          kind: 'fact',
          id: `fact:${relation}:${factIdx++}`,
          relation,
          args: [labels[r], labels[c]],
        })
      }
    }
  }

  // Facts first, then everything else (rules/equations/queries)
  const otherFacts = kept.filter((s) => s.kind === 'fact')
  const nonFacts = kept.filter((s) => s.kind !== 'fact')
  return printProgram([...otherFacts, ...newFacts, ...nonFacts])
}

/** True if source already mentions the relation as fact/rule/query head. */
export function relationExistsInSource(source: string, relation: string): boolean {
  try {
    const prog = parse(source)
    return prog.stmts.some((s) => {
      if (s.kind === 'fact') return s.relation === relation
      if (s.kind === 'rule') return s.head.relation === relation
      if (s.kind === 'query') return s.goal.relation === relation
      return false
    })
  } catch {
    return false
  }
}

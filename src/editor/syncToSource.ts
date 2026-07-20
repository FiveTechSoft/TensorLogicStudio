import type { Expr, Stmt, TensorRef } from '@/types/ast'
import { parse } from '@/core/parser/parse'

export function printRef(ref: TensorRef): string {
  return `${ref.name}[${ref.indices.join(',')}]`
}

export function printExpr(expr: Expr): string {
  switch (expr.kind) {
    case 'ref':
      return printRef(expr.ref)
    case 'bin':
      return `${printExpr(expr.left)} ${expr.op} ${printExpr(expr.right)}`
    case 'call':
      return `${expr.fn}(${printExpr(expr.arg)})`
  }
}

export function printProgram(stmts: Stmt[]): string {
  const lines: string[] = []
  for (const s of stmts) {
    if (s.kind === 'fact') {
      lines.push(`${s.relation}(${s.args.join(', ')}).`)
    } else if (s.kind === 'rule') {
      const body = s.body
        .map((a) => `${a.relation}(${a.args.join(', ')})`)
        .join(', ')
      lines.push(`${s.head.relation}(${s.head.args.join(', ')}) :- ${body}.`)
    } else if (s.kind === 'equation') {
      lines.push(`${printRef(s.lhs)} = ${printExpr(s.rhs)}.`)
    } else if (s.kind === 'query') {
      lines.push(`?- ${s.goal.relation}(${s.goal.args.join(', ')}).`)
    }
  }
  return lines.join('\n') + (lines.length ? '\n' : '')
}

/**
 * Parse source, find statement by `astId`, update its primary display name,
 * and return the reprinted program. Returns null if parse fails or stmt not found.
 *
 * MVP: renames rule head relation, equation LHS tensor, fact relation, or query goal.
 */
export function updateStmtLabel(
  source: string,
  astId: string,
  newLabel: string,
): string | null {
  const label = newLabel.trim()
  if (!label) return null

  try {
    const prog = parse(source)
    const stmt = prog.stmts.find((s) => s.id === astId)
    if (!stmt) return null

    if (stmt.kind === 'rule') {
      stmt.head.relation = label
    } else if (stmt.kind === 'equation') {
      stmt.lhs.name = label
    } else if (stmt.kind === 'fact') {
      stmt.relation = label
    } else if (stmt.kind === 'query') {
      // Graph labels look like "?- ancestor"; accept bare relation too
      const m = /^\?\-\s*(.+)$/.exec(label)
      stmt.goal.relation = (m?.[1] ?? label).trim()
    } else {
      return null
    }

    return printProgram(prog.stmts)
  } catch {
    return null
  }
}

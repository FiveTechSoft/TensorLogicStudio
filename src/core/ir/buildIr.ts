import type { Equation, Fact, Program, Query, Rule } from '@/types/ast'

export interface IrProgram {
  facts: Fact[]
  rules: Rule[]
  equations: Equation[]
  queries: Query[]
  /** Rank of each relation inferred from facts / rule heads / bodies. */
  relationRanks: Map<string, number>
  /** Facts grouped by relation name. */
  factsByRelation: Map<string, Fact[]>
}

function noteRank(ranks: Map<string, number>, name: string, rank: number): void {
  const existing = ranks.get(name)
  if (existing === undefined) {
    ranks.set(name, rank)
  } else if (existing !== rank) {
    throw new Error(
      `relation ${name} used with rank ${rank} but previously rank ${existing}`,
    )
  }
}

/** Extract facts, rules, equations, and queries from a parsed Program. */
export function buildIr(program: Program): IrProgram {
  const facts: Fact[] = []
  const rules: Rule[] = []
  const equations: Equation[] = []
  const queries: Query[] = []
  const relationRanks = new Map<string, number>()
  const factsByRelation = new Map<string, Fact[]>()

  for (const stmt of program.stmts) {
    switch (stmt.kind) {
      case 'fact': {
        facts.push(stmt)
        noteRank(relationRanks, stmt.relation, stmt.args.length)
        const list = factsByRelation.get(stmt.relation) ?? []
        list.push(stmt)
        factsByRelation.set(stmt.relation, list)
        break
      }
      case 'rule': {
        rules.push(stmt)
        noteRank(relationRanks, stmt.head.relation, stmt.head.args.length)
        for (const atom of stmt.body) {
          noteRank(relationRanks, atom.relation, atom.args.length)
        }
        break
      }
      case 'equation':
        equations.push(stmt)
        break
      case 'query':
        queries.push(stmt)
        noteRank(relationRanks, stmt.goal.relation, stmt.goal.args.length)
        break
    }
  }

  return { facts, rules, equations, queries, relationRanks, factsByRelation }
}

export type Index = string

export interface Fact {
  kind: 'fact'
  id: string
  relation: string
  args: string[]
  span?: { start: number; end: number }
}

export interface Atom {
  relation: string
  args: string[]
}

export interface Rule {
  kind: 'rule'
  id: string
  head: Atom
  body: Atom[]
  span?: { start: number; end: number }
}

export interface TensorRef {
  name: string
  indices: Index[]
}

export type Expr =
  | { kind: 'ref'; ref: TensorRef }
  | { kind: 'bin'; op: '*' | '+'; left: Expr; right: Expr }
  | { kind: 'call'; fn: 'step' | 'relu' | 'sigmoid' | 'softmax'; arg: Expr }

export interface Equation {
  kind: 'equation'
  id: string
  lhs: TensorRef
  rhs: Expr
  span?: { start: number; end: number }
}

export interface Query {
  kind: 'query'
  id: string
  goal: Atom
  span?: { start: number; end: number }
}

export type Stmt = Fact | Rule | Equation | Query

export interface Program {
  stmts: Stmt[]
}

import type {
  Atom,
  Equation,
  Expr,
  Fact,
  Program,
  Query,
  Rule,
  Stmt,
  TensorRef,
} from '@/types/ast'
import { LexError, tokenize, type Token, type TokenKind } from './tokenize'

export class ParseError extends Error {
  pos?: number

  constructor(message: string, pos?: number) {
    super(message)
    this.name = 'ParseError'
    this.pos = pos
  }
}

const CALL_FNS = new Set(['step', 'relu', 'sigmoid', 'softmax'] as const)
type CallFn = 'step' | 'relu' | 'sigmoid' | 'softmax'

class Parser {
  private tokens: Token[]
  private i = 0
  private factCounts = new Map<string, number>()
  private ruleCounts = new Map<string, number>()
  private equationCounts = new Map<string, number>()
  private queryCount = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  parse(): Program {
    const stmts: Stmt[] = []
    while (!this.check('EOF')) {
      stmts.push(this.parseStmt())
    }
    return { stmts }
  }

  private parseStmt(): Stmt {
    if (this.check('QUERY')) {
      return this.parseQuery()
    }
    // Equation: Name[idx,...] = expr.
    if (this.check('IDENT') && this.lookAhead(1)?.kind === 'LBRACK') {
      return this.parseEquation()
    }
    // Fact or rule starts with an atom
    const head = this.parseAtom()
    if (this.check('COLON_MINUS')) {
      return this.parseRuleRest(head)
    }
    this.expect('DOT', "expected '.' after fact")
    return this.makeFact(head)
  }

  private parseEquation(): Equation {
    const start = this.peek().pos
    const lhs = this.parseTensorRef()
    this.expect('EQ', "expected '=' in equation")
    const rhs = this.parseExpr()
    this.expect('DOT', "expected '.' after equation")
    return this.makeEquation(lhs, rhs, start)
  }

  private parseExpr(): Expr {
    return this.parseSum()
  }

  /** sum := product ('+' product)* */
  private parseSum(): Expr {
    let left = this.parseProduct()
    while (this.match('PLUS')) {
      const right = this.parseProduct()
      left = { kind: 'bin', op: '+', left, right }
    }
    return left
  }

  /** product := primary ('*' primary)* */
  private parseProduct(): Expr {
    let left = this.parsePrimary()
    while (this.match('STAR')) {
      const right = this.parsePrimary()
      left = { kind: 'bin', op: '*', left, right }
    }
    return left
  }

  /**
   * primary := fn(expr) | tensorRef | (expr)
   * fn ∈ step|relu|sigmoid|softmax
   */
  private parsePrimary(): Expr {
    if (this.check('IDENT')) {
      const name = this.peek().value!
      const next = this.lookAhead(1)
      if (next?.kind === 'LPAREN' && CALL_FNS.has(name as CallFn)) {
        this.i++ // consume IDENT
        this.expect('LPAREN', "expected '(' after function name")
        const arg = this.parseExpr()
        this.expect('RPAREN', "expected ')' after function argument")
        return { kind: 'call', fn: name as CallFn, arg }
      }
      if (next?.kind === 'LBRACK') {
        return { kind: 'ref', ref: this.parseTensorRef() }
      }
      throw new ParseError(
        `expected tensor reference or call, got IDENT(${name})`,
        this.peek().pos,
      )
    }
    if (this.match('LPAREN')) {
      const e = this.parseExpr()
      this.expect('RPAREN', "expected ')' after expression")
      return e
    }
    throw new ParseError(
      `expected expression, got ${this.peek().kind}`,
      this.peek().pos,
    )
  }

  private parseTensorRef(): TensorRef {
    const nameTok = this.expect('IDENT', 'expected tensor name')
    this.expect('LBRACK', "expected '[' after tensor name")
    const indices: string[] = []
    if (!this.check('RBRACK')) {
      indices.push(this.expect('IDENT', 'expected index').value!)
      while (this.match('COMMA')) {
        indices.push(this.expect('IDENT', 'expected index').value!)
      }
    }
    this.expect('RBRACK', "expected ']' after indices")
    return { name: nameTok.value!, indices }
  }

  private parseQuery(): Query {
    const start = this.peek().pos
    this.expect('QUERY')
    const goal = this.parseAtom()
    this.expect('DOT', "expected '.' after query")
    const id = `query-${this.queryCount++}`
    return {
      kind: 'query',
      id,
      goal,
      span: { start, end: this.prev().pos + 1 },
    }
  }

  private parseRuleRest(head: Atom): Rule {
    const start = this.prev().pos // rough; better would be head start
    this.expect('COLON_MINUS')
    const body: Atom[] = [this.parseAtom()]
    while (this.match('COMMA')) {
      body.push(this.parseAtom())
    }
    this.expect('DOT', "expected '.' after rule")
    return this.makeRule(head, body, start)
  }

  private parseAtom(): Atom {
    const nameTok = this.expect('IDENT', 'expected relation name')
    this.expect('LPAREN', "expected '(' after relation name")
    const args: string[] = []
    if (!this.check('RPAREN')) {
      args.push(this.expect('IDENT', 'expected argument').value!)
      while (this.match('COMMA')) {
        args.push(this.expect('IDENT', 'expected argument').value!)
      }
    }
    this.expect('RPAREN', "expected ')' after arguments")
    return { relation: nameTok.value!, args }
  }

  private makeFact(atom: Atom): Fact {
    const n = this.factCounts.get(atom.relation) ?? 0
    this.factCounts.set(atom.relation, n + 1)
    return {
      kind: 'fact',
      id: `fact-${atom.relation}-${n}`,
      relation: atom.relation,
      args: atom.args,
    }
  }

  private makeRule(head: Atom, body: Atom[], start: number): Rule {
    const n = this.ruleCounts.get(head.relation) ?? 0
    this.ruleCounts.set(head.relation, n + 1)
    return {
      kind: 'rule',
      id: `rule-${head.relation}-${n}`,
      head,
      body,
      span: { start, end: this.prev().pos + 1 },
    }
  }

  private makeEquation(lhs: TensorRef, rhs: Expr, start: number): Equation {
    const n = this.equationCounts.get(lhs.name) ?? 0
    this.equationCounts.set(lhs.name, n + 1)
    return {
      kind: 'equation',
      id: `equation-${lhs.name}-${n}`,
      lhs,
      rhs,
      span: { start, end: this.prev().pos + 1 },
    }
  }

  private peek(): Token {
    return this.tokens[this.i]!
  }

  private lookAhead(offset: number): Token | undefined {
    return this.tokens[this.i + offset]
  }

  private prev(): Token {
    return this.tokens[this.i - 1]!
  }

  private check(kind: TokenKind): boolean {
    return this.peek().kind === kind
  }

  private match(kind: TokenKind): boolean {
    if (this.check(kind)) {
      this.i++
      return true
    }
    return false
  }

  private expect(kind: TokenKind, message?: string): Token {
    const tok = this.peek()
    if (tok.kind !== kind) {
      const got =
        tok.kind === 'IDENT' && tok.value != null
          ? `IDENT(${tok.value})`
          : tok.kind
      throw new ParseError(
        message ?? `expected ${kind}, got ${got}`,
        tok.pos,
      )
    }
    this.i++
    return tok
  }
}

/** Parse a Tensor Logic program (facts, rules, equations, queries). */
export function parse(source: string): Program {
  try {
    const tokens = tokenize(source)
    return new Parser(tokens).parse()
  } catch (e) {
    if (e instanceof LexError) {
      throw new ParseError(e.message, e.pos)
    }
    throw e
  }
}

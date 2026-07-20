export type TokenKind =
  | 'IDENT'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'DOT'
  | 'COLON_MINUS'
  | 'QUERY'
  | 'EOF'

export interface Token {
  kind: TokenKind
  value?: string
  pos: number
}

export class LexError extends Error {
  pos: number

  constructor(message: string, pos: number) {
    super(message)
    this.name = 'LexError'
    this.pos = pos
  }
}

export function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = source.length

  const isIdentStart = (c: string) => /[A-Za-z_]/.test(c)
  const isIdentPart = (c: string) => /[A-Za-z0-9_]/.test(c)
  const isSpace = (c: string) => c === ' ' || c === '\t' || c === '\n' || c === '\r'

  while (i < n) {
    const c = source[i]!

    if (isSpace(c)) {
      i++
      continue
    }

    // Line comments: % ... or // ...
    if (c === '%') {
      while (i < n && source[i] !== '\n') i++
      continue
    }
    if (c === '/' && source[i + 1] === '/') {
      i += 2
      while (i < n && source[i] !== '\n') i++
      continue
    }

    // Multi-char operators
    if (c === ':' && source[i + 1] === '-') {
      tokens.push({ kind: 'COLON_MINUS', pos: i })
      i += 2
      continue
    }
    if (c === '?' && source[i + 1] === '-') {
      tokens.push({ kind: 'QUERY', pos: i })
      i += 2
      continue
    }

    // Single-char tokens
    if (c === '(') {
      tokens.push({ kind: 'LPAREN', pos: i })
      i++
      continue
    }
    if (c === ')') {
      tokens.push({ kind: 'RPAREN', pos: i })
      i++
      continue
    }
    if (c === ',') {
      tokens.push({ kind: 'COMMA', pos: i })
      i++
      continue
    }
    if (c === '.') {
      tokens.push({ kind: 'DOT', pos: i })
      i++
      continue
    }

    // Identifier
    if (isIdentStart(c)) {
      const start = i
      i++
      while (i < n && isIdentPart(source[i]!)) i++
      tokens.push({ kind: 'IDENT', value: source.slice(start, i), pos: start })
      continue
    }

    throw new LexError(`Unexpected character '${c}'`, i)
  }

  tokens.push({ kind: 'EOF', pos: n })
  return tokens
}

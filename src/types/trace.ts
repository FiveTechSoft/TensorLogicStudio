export interface TraceEvent {
  iteration: number
  message: string
  nodeIds?: string[]
  equationId?: string
  newFacts?: number
  ms?: number
}

type Handler = (payload: unknown) => void

export class EventBus {
  private map = new Map<string, Set<Handler>>()
  on(event: string, h: Handler): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set())
    this.map.get(event)!.add(h)
    return () => this.map.get(event)!.delete(h)
  }
  emit(event: string, payload?: unknown): void {
    this.map.get(event)?.forEach((h) => h(payload))
  }
  clear(): void {
    this.map.clear()
  }
}

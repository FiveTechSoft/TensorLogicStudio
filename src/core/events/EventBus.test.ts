import { describe, it, expect, vi } from 'vitest'
import { EventBus } from './EventBus'

describe('EventBus', () => {
  it('dispatches to subscribers', () => {
    const bus = new EventBus()
    const fn = vi.fn()
    bus.on('run', fn)
    bus.emit('run', { source: 'toolbar' })
    expect(fn).toHaveBeenCalledWith({ source: 'toolbar' })
  })
})

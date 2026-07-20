import { describe, it, expect } from 'vitest'
import { SparseBoolTensor } from '../tensor/Tensor'
import { joinProject, stepBool } from './joinProject'

describe('joinProject', () => {
  it('implements parent compose parent → grandparent', () => {
    const parent = new SparseBoolTensor(2)
    parent.add(['adam', 'seth'])
    parent.add(['seth', 'enos'])
    parent.add(['enos', 'cainan'])

    const gp = joinProject(
      [
        { tensor: parent, vars: ['X', 'Y'] },
        { tensor: parent, vars: ['Y', 'Z'] },
      ],
      ['X', 'Z'],
    )
    expect(gp.has(['adam', 'enos'])).toBe(true)
    expect(gp.has(['seth', 'cainan'])).toBe(true)
    expect(gp.has(['adam', 'cainan'])).toBe(false)
  })

  it('stepBool thresholds counts to 0/1', () => {
    expect(stepBool(0)).toBe(0)
    expect(stepBool(2)).toBe(1)
  })
})

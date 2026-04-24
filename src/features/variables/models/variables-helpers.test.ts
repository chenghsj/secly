import { describe, expect, it } from 'vitest'
import { shouldPreserveSelectedEnvironmentOnScopeSwitch } from './variables-helpers'

describe('shouldPreserveSelectedEnvironmentOnScopeSwitch', () => {
  it('keeps the selected environment when switching between environment scopes', () => {
    expect(
      shouldPreserveSelectedEnvironmentOnScopeSwitch({
        nextScope: 'environment-variables',
        selectedEnvironment: 'production-announcement',
      }),
    ).toBe(true)
  })

  it('does not preserve the environment when entering environment scope without a selection', () => {
    expect(
      shouldPreserveSelectedEnvironmentOnScopeSwitch({
        nextScope: 'environment-variables',
        selectedEnvironment: '',
      }),
    ).toBe(false)
  })
})

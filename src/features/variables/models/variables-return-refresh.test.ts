import { describe, expect, it } from 'vitest'
import { shouldAutoRefreshVariablesOnReturn } from './variables-return-refresh'

describe('shouldAutoRefreshVariablesOnReturn', () => {
  it('returns true when the page is visible, idle, and stale enough', () => {
    expect(
      shouldAutoRefreshVariablesOnReturn({
        hasActiveRequests: false,
        isAuthenticated: true,
        isDocumentVisible: true,
        isEntryEditorOpen: false,
        isEnvironmentCreateOpen: false,
        isPageRefreshInFlight: false,
        lastRefreshAt: 0,
        now: 20_000,
        selectedRepository: 'cheng/foo',
      }),
    ).toBe(true)
  })

  it('returns false during the throttle window', () => {
    expect(
      shouldAutoRefreshVariablesOnReturn({
        hasActiveRequests: false,
        isAuthenticated: true,
        isDocumentVisible: true,
        isEntryEditorOpen: false,
        isEnvironmentCreateOpen: false,
        isPageRefreshInFlight: false,
        lastRefreshAt: 10_000,
        now: 20_000,
        selectedRepository: 'cheng/foo',
      }),
    ).toBe(false)
  })

  it('returns false while editing', () => {
    expect(
      shouldAutoRefreshVariablesOnReturn({
        hasActiveRequests: false,
        isAuthenticated: true,
        isDocumentVisible: true,
        isEntryEditorOpen: true,
        isEnvironmentCreateOpen: false,
        isPageRefreshInFlight: false,
        lastRefreshAt: 0,
        now: 20_000,
        selectedRepository: 'cheng/foo',
      }),
    ).toBe(false)
  })

  it('returns false while the page is hidden, busy, or unselected', () => {
    expect(
      shouldAutoRefreshVariablesOnReturn({
        hasActiveRequests: true,
        isAuthenticated: true,
        isDocumentVisible: false,
        isEntryEditorOpen: false,
        isEnvironmentCreateOpen: false,
        isPageRefreshInFlight: true,
        lastRefreshAt: 0,
        now: 20_000,
        selectedRepository: '',
      }),
    ).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  getConnectRouteStatus,
  shouldUseConnectFullscreenShell,
} from './app-shell-layout'

describe('getConnectRouteStatus', () => {
  it('returns the route status when loader data contains it', () => {
    expect(
      getConnectRouteStatus({
        status: {
          authenticated: false,
          knownAccounts: [],
        },
      }),
    ).toEqual({
      authenticated: false,
      knownAccounts: [],
    })
  })

  it('returns null when the loader data has no status payload', () => {
    expect(getConnectRouteStatus(undefined)).toBeNull()
    expect(getConnectRouteStatus({})).toBeNull()
  })
})

describe('shouldUseConnectFullscreenShell', () => {
  it('uses the fullscreen guest shell for unauthenticated connect routes', () => {
    expect(
      shouldUseConnectFullscreenShell('/connect', {
        authenticated: false,
      } as never),
    ).toBe(true)
  })

  it('keeps the standard app shell for authenticated connect routes', () => {
    expect(
      shouldUseConnectFullscreenShell('/connect', {
        authenticated: true,
      } as never),
    ).toBe(false)
  })

  it('keeps the standard app shell outside the connect route', () => {
    expect(
      shouldUseConnectFullscreenShell('/variables', {
        authenticated: false,
      } as never),
    ).toBe(false)
  })
})

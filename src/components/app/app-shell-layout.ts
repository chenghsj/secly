import type { GhAuthStatus } from '../../server/gh-auth.server'

export function getConnectRouteStatus(loaderData: unknown) {
  return (loaderData as { status?: GhAuthStatus } | undefined)?.status ?? null
}

export function shouldUseConnectFullscreenShell(
  pathname: string,
  status: GhAuthStatus | null,
) {
  if (!pathname.startsWith('/connect')) {
    return false
  }

  return status?.authenticated === false
}

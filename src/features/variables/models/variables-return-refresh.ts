const VARIABLES_RETURN_REFRESH_MIN_INTERVAL_MS = 15_000

export function shouldAutoRefreshVariablesOnReturn({
  hasActiveRequests,
  isAuthenticated,
  isDocumentVisible,
  isEntryEditorOpen,
  isEnvironmentCreateOpen,
  isPageRefreshInFlight,
  lastRefreshAt,
  now,
  selectedRepository,
}: {
  hasActiveRequests: boolean
  isAuthenticated: boolean
  isDocumentVisible: boolean
  isEntryEditorOpen: boolean
  isEnvironmentCreateOpen: boolean
  isPageRefreshInFlight: boolean
  lastRefreshAt: number
  now: number
  selectedRepository: string
}) {
  if (
    hasActiveRequests ||
    !isAuthenticated ||
    !isDocumentVisible ||
    isEntryEditorOpen ||
    isEnvironmentCreateOpen ||
    isPageRefreshInFlight ||
    !selectedRepository
  ) {
    return false
  }

  return now - lastRefreshAt >= VARIABLES_RETURN_REFRESH_MIN_INTERVAL_MS
}

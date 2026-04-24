import type { SettingsScope } from '#/lib/variables-route-search'
import { isEnvironmentScope } from '#/features/variables/models/variables-helpers'

type RefreshOptions = {
  forceRefresh?: boolean
}

type RefreshEntries = (options?: RefreshOptions) => Promise<void>
type RefreshPageData = (options?: RefreshOptions) => Promise<void>

type MutationRefreshControls = {
  refreshCurrentEntries: RefreshEntries
  refreshPageData: RefreshPageData
  scope: SettingsScope
}

export async function refreshDataAfterMutation({
  refreshCurrentEntries,
  refreshPageData,
  scope,
}: MutationRefreshControls) {
  if (isEnvironmentScope(scope)) {
    await refreshPageData({ forceRefresh: true })
    return
  }

  await refreshCurrentEntries({ forceRefresh: true })
}

export async function tryRefreshDataAfterMutation(
  controls: MutationRefreshControls,
) {
  try {
    await refreshDataAfterMutation(controls)
  } catch {
    // Keep the completed mutation visible even if the follow-up reload fails.
  }
}

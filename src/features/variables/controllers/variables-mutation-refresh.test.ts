import { describe, expect, it, vi } from 'vitest'
import {
  refreshDataAfterMutation,
  tryRefreshDataAfterMutation,
} from './variables-mutation-refresh'

describe('refreshDataAfterMutation', () => {
  it('refreshes page data for environment-scoped mutations', async () => {
    const refreshCurrentEntries = vi.fn().mockResolvedValue(undefined)
    const refreshPageData = vi.fn().mockResolvedValue(undefined)

    await refreshDataAfterMutation({
      refreshCurrentEntries,
      refreshPageData,
      scope: 'environment-variables',
    })

    expect(refreshPageData).toHaveBeenCalledWith({ forceRefresh: true })
    expect(refreshCurrentEntries).not.toHaveBeenCalled()
  })

  it('refreshes current entries for repository-scoped mutations', async () => {
    const refreshCurrentEntries = vi.fn().mockResolvedValue(undefined)
    const refreshPageData = vi.fn().mockResolvedValue(undefined)

    await refreshDataAfterMutation({
      refreshCurrentEntries,
      refreshPageData,
      scope: 'repository-secrets',
    })

    expect(refreshCurrentEntries).toHaveBeenCalledWith({ forceRefresh: true })
    expect(refreshPageData).not.toHaveBeenCalled()
  })
})

describe('tryRefreshDataAfterMutation', () => {
  it('swallows follow-up refresh failures after a completed mutation', async () => {
    const refreshCurrentEntries = vi.fn().mockRejectedValue(new Error('boom'))
    const refreshPageData = vi.fn().mockResolvedValue(undefined)

    await expect(
      tryRefreshDataAfterMutation({
        refreshCurrentEntries,
        refreshPageData,
        scope: 'repository-variables',
      }),
    ).resolves.toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'
import { translations } from '#/messages'
import { useVariablesRoutePageState } from './use-variables-route-page-state'

const variablesMessages = translations.en.variables

describe('useVariablesRoutePageState', () => {
  it('does not mark the target panel as refreshing during environment-only refreshes', () => {
    const result = useVariablesRoutePageState({
      activeScope: 'environment-variables',
      environmentsRepository: 'acme/repo',
      hasLoadedCurrentEntries: true,
      isRefreshingEntries: false,
      isRefreshingEnvironments: true,
      isRefreshingRepositories: false,
      selectedEnvironment: 'production',
      selectedRepository: 'acme/repo',
      variablesMessages,
    })

    expect(result.status.isListLoading).toBe(true)
    expect(result.status.isTargetRefreshing).toBe(false)
  })

  it('keeps the target panel refreshing state for repository refreshes', () => {
    const result = useVariablesRoutePageState({
      activeScope: 'repository-variables',
      environmentsRepository: 'acme/repo',
      hasLoadedCurrentEntries: true,
      isRefreshingEntries: false,
      isRefreshingEnvironments: false,
      isRefreshingRepositories: true,
      selectedEnvironment: '',
      selectedRepository: 'acme/repo',
      variablesMessages,
    })

    expect(result.status.isTargetRefreshing).toBe(true)
  })
})

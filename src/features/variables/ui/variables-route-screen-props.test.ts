import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import {
  createVariablesEnvironmentCreateDialogProps,
  createVariablesGlobalSearchDialogProps,
  createVariablesTargetPanelStatus,
  createVariablesTargetPanelProps,
} from './variables-route-screen-props'

describe('createVariablesEnvironmentCreateDialogProps', () => {
  it('clears the stale error before updating the environment name', () => {
    const setEnvironmentNameError = vi.fn()
    const setEnvironmentName = vi.fn()

    const props = createVariablesEnvironmentCreateDialogProps({
      environmentName: '',
      environmentNameError: 'Already exists',
      environmentNameErrorId: 'environment-name-error',
      environmentNameInputId: 'environment-name-input',
      handleCreateEnvironment: vi.fn(),
      isCreatingEnvironment: false,
      isEnvironmentCreateOpen: true,
      requestCloseEnvironmentCreate: vi.fn(),
      selectedRepository: 'acme/repo',
      setEnvironmentName,
      setEnvironmentNameError,
      variablesMessages: translations.en.variables,
    })

    props.actions.onEnvironmentNameChange('preview')

    expect(setEnvironmentNameError).toHaveBeenCalledWith(null)
    expect(setEnvironmentName).toHaveBeenCalledWith('preview')
  })
})

describe('createVariablesGlobalSearchDialogProps', () => {
  it('retries by resetting cached results before loading the current repository', () => {
    const resetGlobalSearchData = vi.fn()
    const loadGlobalSearchForRepository = vi.fn().mockResolvedValue(undefined)

    const props = createVariablesGlobalSearchDialogProps({
      filteredResults: [],
      globalSearchError: null,
      globalSearchInputId: 'global-entry-search-input',
      globalSearchQuery: '',
      isGlobalSearchDialogOpen: false,
      isGlobalSearchLoading: false,
      loadGlobalSearchForRepository,
      locale: 'en',
      resetGlobalSearchData,
      saveGlobalSearchResult: vi.fn(),
      selectedRepository: 'acme/repo',
      setGlobalSearchQuery: vi.fn(),
      setIsGlobalSearchDialogOpen: vi.fn(),
      trimmedGlobalSearchQuery: '',
      variablesMessages: translations.en.variables,
    })

    props.actions.onRetry()

    expect(resetGlobalSearchData).toHaveBeenCalledOnce()
    expect(loadGlobalSearchForRepository).toHaveBeenCalledWith('acme/repo')
  })
})

describe('createVariablesTargetPanelProps', () => {
  it('keeps scope changes enabled while list loading or a target switch is pending', () => {
    expect(
      createVariablesTargetPanelStatus({
        isDeletingEnvironment: false,
        isEnvironmentActionDisabled: false,
        isEnvironmentEditing: false,
        isRefreshingEnvironments: false,
        isRefreshingRepositories: false,
        isTargetRefreshing: false,
      }).isScopeChangeDisabled,
    ).toBe(false)

    expect(
      createVariablesTargetPanelStatus({
        isDeletingEnvironment: false,
        isEnvironmentActionDisabled: false,
        isEnvironmentEditing: false,
        isRefreshingEnvironments: false,
        isRefreshingRepositories: false,
        isTargetRefreshing: false,
      }).isScopeChangeDisabled,
    ).toBe(false)

    expect(
      createVariablesTargetPanelStatus({
        isDeletingEnvironment: false,
        isEnvironmentActionDisabled: false,
        isEnvironmentEditing: false,
        isRefreshingEnvironments: false,
        isRefreshingRepositories: false,
        isTargetRefreshing: false,
      }).isScopeChangeDisabled,
    ).toBe(false)
  })

  it('does not enqueue a repository change when the selection is unchanged', () => {
    const handleRepositoryChange = vi.fn().mockResolvedValue(undefined)

    const props = createVariablesTargetPanelProps({
      activeScope: 'repository-variables',
      clearEnvironmentEditing: vi.fn(),
      environmentSelectionError: null,
      environments: [],
      handleEnvironmentChange: vi.fn().mockResolvedValue(undefined),
      handleRepositoryChange,
      handleScopeChange: vi.fn().mockResolvedValue(undefined),
      handleScopePrefetch: vi.fn().mockResolvedValue(undefined),
      isDeletingEnvironment: false,
      isEnvironmentActionDisabled: false,
      isEnvironmentEditing: false,
      isListLoading: false,
      isRefreshingEnvironments: false,
      isRefreshingRepositories: false,
      isTargetRefreshing: false,
      openEnvironmentCreate: vi.fn(),
      refreshPageData: vi.fn().mockResolvedValue(undefined),
      repositories: [],
      repositoryError: null,
      requestDeleteEnvironment: vi.fn(),
      selectedEnvironment: '',
      selectedRepository: 'acme/repo',
      setIsEnvironmentEditing: vi.fn(),
      variablesMessages: translations.en.variables,
    })

    props.actions.onRepositoryChange('acme/repo')

    expect(handleRepositoryChange).not.toHaveBeenCalled()
  })
})

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useManagedRequestSlots } from '#/hooks/use-managed-request-slots'
import type {
  SettingsScope,
  VariablesSearch,
} from '#/lib/variables-route-search'
import {
  getEnvironmentSecrets,
  getEnvironmentVariables,
  getRepositoryEnvironments,
  getRepositorySecrets,
} from '#/server/gh-actions-settings.functions'
import {
  getManageableRepositories,
  getRepositoryVariables,
} from '#/server/gh-repository-variables.functions'
import type {
  EntryEditorContext,
  GlobalSearchLoadResult,
  VariablesMessages,
} from './variables-types'
import type { VariablesStore } from './variables-store'
import { requestCloseEntryEditor as requestCloseVariablesEntryEditor } from './variables-entry-editor'
import {
  applyEnvironmentViewChange,
  applyRepositoryViewChange,
  applyScopeViewChange,
} from './variables-view-switch'
import {
  createGlobalSearchResults,
  formatMessage,
  getScopeConfig,
  isEnvironmentScope,
} from './variables-selectors'

const managedRequestKinds = [
  'global-search',
  'repository-variables',
  'repository-secrets',
  'environments',
  'environment-variables',
  'environment-secrets',
] as const

type ManagedRequestKind = (typeof managedRequestKinds)[number]

const entryRequestKinds: readonly ManagedRequestKind[] = [
  'repository-variables',
  'repository-secrets',
  'environment-variables',
  'environment-secrets',
]

const environmentRequestKinds: readonly ManagedRequestKind[] = ['environments']

type UpdateVariablesSearch = (
  nextValues: Partial<VariablesSearch>,
  options?: {
    replace?: boolean
  },
) => Promise<void>

type NavigateVariablesSearch = (options: {
  replace?: boolean
  resetScroll?: boolean
  search: (previous: VariablesSearch) => VariablesSearch
}) => Promise<void>

type VariablesOrchestrationParams = Pick<
  VariablesStore,
  | 'clearEnvironmentEditing'
  | 'clearGlobalSearchData'
  | 'clearTableEditing'
  | 'closeEntryEditorImmediately'
  | 'closeEnvironmentCreateImmediately'
  | 'environmentSecrets'
  | 'environmentSecretsKey'
  | 'environmentVariables'
  | 'environmentVariablesKey'
  | 'environments'
  | 'environmentsRepository'
  | 'globalSearchRepository'
  | 'isEntryEditorOpen'
  | 'isEnvironmentCreateOpen'
  | 'repositorySecrets'
  | 'repositorySecretsRepository'
  | 'repositoryVariables'
  | 'repositoryVariablesRepository'
  | 'resetRepositoryScopedData'
  | 'setEnvironmentSecrets'
  | 'setEnvironmentSecretsKey'
  | 'setEnvironmentSelectionError'
  | 'setEnvironmentVariables'
  | 'setEnvironmentVariablesKey'
  | 'setEnvironments'
  | 'setEnvironmentsRepository'
  | 'setGlobalSearchError'
  | 'setGlobalSearchRepository'
  | 'setGlobalSearchResults'
  | 'setIsGlobalSearchDialogOpen'
  | 'setIsGlobalSearchLoading'
  | 'setIsRefreshingEntries'
  | 'setIsRefreshingEnvironments'
  | 'setIsRefreshingRepositories'
  | 'setRepositoryError'
  | 'setRepositories'
  | 'setRepositorySecrets'
  | 'setRepositorySecretsRepository'
  | 'setRepositoryVariables'
  | 'setRepositoryVariablesRepository'
  | 'shouldRestoreGlobalSearchAfterEditorClose'
> & {
  activeScope: SettingsScope
  authIdentity: string
  navigate: NavigateVariablesSearch
  searchEnvironment: string | undefined
  selectedEnvironment: string
  selectedRepository: string
  statusAuthenticated: boolean
  trimmedGlobalSearchQuery: string
  updateVariablesSearch: UpdateVariablesSearch
  variablesMessages: VariablesMessages
}

export function useVariablesOrchestration({
  activeScope,
  authIdentity,
  clearEnvironmentEditing,
  clearGlobalSearchData,
  clearTableEditing,
  closeEntryEditorImmediately,
  closeEnvironmentCreateImmediately,
  environmentSecrets,
  environmentSecretsKey,
  environmentVariables,
  environmentVariablesKey,
  environments,
  environmentsRepository,
  globalSearchRepository,
  isEntryEditorOpen,
  isEnvironmentCreateOpen,
  navigate,
  repositorySecrets,
  repositorySecretsRepository,
  repositoryVariables,
  repositoryVariablesRepository,
  resetRepositoryScopedData,
  searchEnvironment,
  selectedEnvironment,
  selectedRepository,
  setEnvironmentSecrets,
  setEnvironmentSecretsKey,
  setEnvironmentSelectionError,
  setEnvironmentVariables,
  setEnvironmentVariablesKey,
  setEnvironments,
  setEnvironmentsRepository,
  setGlobalSearchError,
  setGlobalSearchRepository,
  setGlobalSearchResults,
  setIsGlobalSearchDialogOpen,
  setIsGlobalSearchLoading,
  setIsRefreshingEntries,
  setIsRefreshingEnvironments,
  setIsRefreshingRepositories,
  setRepositories,
  setRepositoryError,
  setRepositorySecrets,
  setRepositorySecretsRepository,
  setRepositoryVariables,
  setRepositoryVariablesRepository,
  shouldRestoreGlobalSearchAfterEditorClose,
  statusAuthenticated,
  trimmedGlobalSearchQuery,
  updateVariablesSearch,
  variablesMessages,
}: VariablesOrchestrationParams) {
  const selectedRepositoryRef = useRef(selectedRepository)
  const selectedEnvironmentRef = useRef(selectedEnvironment)
  const {
    abortManagedRequest,
    abortManagedRequests,
    hasActiveManagedRequest,
    runManagedRequest,
  } = useManagedRequestSlots(managedRequestKinds)

  useEffect(() => {
    selectedRepositoryRef.current = selectedRepository
    selectedEnvironmentRef.current = selectedEnvironment
  }, [selectedEnvironment, selectedRepository])

  function syncEntryRefreshingState() {
    setIsRefreshingEntries(hasActiveManagedRequest(entryRequestKinds))
  }

  function syncEnvironmentRefreshingState() {
    setIsRefreshingEnvironments(
      hasActiveManagedRequest(environmentRequestKinds),
    )
  }

  function resetGlobalSearchData() {
    abortManagedRequest('global-search')
    clearGlobalSearchData()
  }

  function abortAllManagedRequests() {
    abortManagedRequests()
    setIsRefreshingEntries(false)
    setIsRefreshingEnvironments(false)
    setIsGlobalSearchLoading(false)
  }

  function requestCloseEntryEditor() {
    requestCloseVariablesEntryEditor(
      {
        closeEntryEditorImmediately,
        setIsGlobalSearchDialogOpen,
      },
      {
        isEntryEditorOpen,
        shouldRestoreGlobalSearchAfterEditorClose,
        trimmedGlobalSearchQuery,
      },
    )
  }

  function requestCloseEnvironmentCreate() {
    if (!isEnvironmentCreateOpen) {
      return
    }

    closeEnvironmentCreateImmediately()
  }

  function showLoadError(subject: string, error: unknown) {
    toast.error(
      formatMessage(variablesMessages.errors.loadFailed, { subject }),
      {
        description:
          error instanceof Error
            ? error.message
            : formatMessage(variablesMessages.errors.loadFailed, { subject }),
      },
    )
  }

  async function loadRepositoryVariablesForRepository(repository: string) {
    if (!repository) {
      abortManagedRequest('repository-variables')
      syncEntryRefreshingState()
      setRepositoryVariables([])
      setRepositoryVariablesRepository('')
      return
    }

    await runManagedRequest({
      execute: (signal) =>
        getRepositoryVariables({
          data: { repository },
          signal,
        }),
      kind: 'repository-variables',
      onError: (error) => {
        showLoadError(
          getScopeConfig(variablesMessages, 'repository-variables').loadLabel,
          error,
        )
      },
      onFinish: syncEntryRefreshingState,
      onStart: () => setIsRefreshingEntries(true),
      onSuccess: (nextVariables) => {
        setRepositoryVariables(nextVariables)
        setRepositoryVariablesRepository(repository)
      },
      requestKey: repository,
    })
  }

  async function loadRepositorySecretsForRepository(repository: string) {
    if (!repository) {
      abortManagedRequest('repository-secrets')
      syncEntryRefreshingState()
      setRepositorySecrets([])
      setRepositorySecretsRepository('')
      return
    }

    await runManagedRequest({
      execute: (signal) =>
        getRepositorySecrets({
          data: { repository },
          signal,
        }),
      kind: 'repository-secrets',
      onError: (error) => {
        showLoadError(
          getScopeConfig(variablesMessages, 'repository-secrets').loadLabel,
          error,
        )
      },
      onFinish: syncEntryRefreshingState,
      onStart: () => setIsRefreshingEntries(true),
      onSuccess: (nextSecrets) => {
        setRepositorySecrets(nextSecrets)
        setRepositorySecretsRepository(repository)
      },
      requestKey: repository,
    })
  }

  async function loadEnvironmentsForRepository(
    repository: string,
    preferredEnvironmentName = selectedEnvironment,
  ) {
    if (!repository) {
      abortManagedRequest('environments')
      syncEnvironmentRefreshingState()
      setEnvironments([])
      setEnvironmentsRepository('')
      return ''
    }

    let resolvedEnvironmentName = ''

    await runManagedRequest({
      execute: (signal) =>
        getRepositoryEnvironments({
          data: { repository },
          signal,
        }),
      kind: 'environments',
      onError: (error) => {
        showLoadError(variablesMessages.environmentLabel, error)
      },
      onFinish: syncEnvironmentRefreshingState,
      onStart: () => setIsRefreshingEnvironments(true),
      onSuccess: (nextEnvironments) => {
        const latestSelectedEnvironment = selectedEnvironmentRef.current
        const stableSelectedEnvironment =
          selectedRepositoryRef.current === repository &&
          latestSelectedEnvironment &&
          nextEnvironments.some(
            (environment) => environment.name === latestSelectedEnvironment,
          )
            ? latestSelectedEnvironment
            : nextEnvironments.some(
                  (environment) =>
                    environment.name === preferredEnvironmentName,
                )
              ? preferredEnvironmentName
              : (nextEnvironments[0]?.name ?? '')

        resolvedEnvironmentName = stableSelectedEnvironment

        setEnvironments(nextEnvironments)
        setEnvironmentsRepository(repository)
        setEnvironmentSelectionError(null)

        if (
          selectedRepositoryRef.current === repository &&
          stableSelectedEnvironment !== selectedEnvironmentRef.current
        ) {
          void updateVariablesSearch(
            {
              environment: stableSelectedEnvironment || undefined,
            },
            {
              replace: true,
            },
          )
        }

        if (!stableSelectedEnvironment) {
          setEnvironmentVariables([])
          setEnvironmentVariablesKey('')
          setEnvironmentSecrets([])
          setEnvironmentSecretsKey('')
        }
      },
      requestKey: repository,
    })

    return resolvedEnvironmentName
  }

  async function loadEnvironmentVariablesForSelection(
    repository: string,
    nextEnvironmentName: string,
  ) {
    if (!repository || !nextEnvironmentName) {
      abortManagedRequest('environment-variables')
      syncEntryRefreshingState()
      setEnvironmentVariables([])
      setEnvironmentVariablesKey('')
      return
    }

    await runManagedRequest({
      execute: (signal) =>
        getEnvironmentVariables({
          data: {
            environmentName: nextEnvironmentName,
            repository,
          },
          signal,
        }),
      kind: 'environment-variables',
      onError: (error) => {
        showLoadError(
          getScopeConfig(variablesMessages, 'environment-variables').loadLabel,
          error,
        )
      },
      onFinish: syncEntryRefreshingState,
      onStart: () => setIsRefreshingEntries(true),
      onSuccess: (nextVariables) => {
        setEnvironmentVariables(nextVariables)
        setEnvironmentVariablesKey(`${repository}:${nextEnvironmentName}`)
      },
      requestKey: `${repository}:${nextEnvironmentName}`,
    })
  }

  async function loadEnvironmentSecretsForSelection(
    repository: string,
    nextEnvironmentName: string,
  ) {
    if (!repository || !nextEnvironmentName) {
      abortManagedRequest('environment-secrets')
      syncEntryRefreshingState()
      setEnvironmentSecrets([])
      setEnvironmentSecretsKey('')
      return
    }

    await runManagedRequest({
      execute: (signal) =>
        getEnvironmentSecrets({
          data: {
            environmentName: nextEnvironmentName,
            repository,
          },
          signal,
        }),
      kind: 'environment-secrets',
      onError: (error) => {
        showLoadError(
          getScopeConfig(variablesMessages, 'environment-secrets').loadLabel,
          error,
        )
      },
      onFinish: syncEntryRefreshingState,
      onStart: () => setIsRefreshingEntries(true),
      onSuccess: (nextSecrets) => {
        setEnvironmentSecrets(nextSecrets)
        setEnvironmentSecretsKey(`${repository}:${nextEnvironmentName}`)
      },
      requestKey: `${repository}:${nextEnvironmentName}`,
    })
  }

  async function refreshCurrentEntriesForSelection(
    repository: string,
    targetEnvironmentName: string,
    {
      showSelectionError = true,
    }: {
      showSelectionError?: boolean
    } = {},
  ) {
    if (!repository) {
      return
    }

    if (activeScope === 'repository-variables') {
      await loadRepositoryVariablesForRepository(repository)
      return
    }

    if (activeScope === 'repository-secrets') {
      await loadRepositorySecretsForRepository(repository)
      return
    }

    if (!targetEnvironmentName) {
      if (showSelectionError) {
        setEnvironmentSelectionError(
          variablesMessages.validation.selectEnvironmentBeforeLoading,
        )
      }
      return
    }

    if (activeScope === 'environment-variables') {
      await loadEnvironmentVariablesForSelection(
        repository,
        targetEnvironmentName,
      )
      return
    }

    await loadEnvironmentSecretsForSelection(repository, targetEnvironmentName)
  }

  async function refreshCurrentEntries() {
    await refreshCurrentEntriesForSelection(
      selectedRepository,
      selectedEnvironment,
    )
  }

  async function refreshPageData() {
    setIsRefreshingRepositories(true)

    try {
      const nextRepositories = await getManageableRepositories()
      const nextRepository = nextRepositories.some(
        (repository) => repository.nameWithOwner === selectedRepository,
      )
        ? selectedRepository
        : (nextRepositories[0]?.nameWithOwner ?? '')

      setRepositories(nextRepositories)

      if (nextRepository !== selectedRepository) {
        await applyRepositoryChange(nextRepository)
        return
      }

      let nextEnvironmentName = selectedEnvironment

      if (isEnvironmentScope(activeScope) && nextRepository) {
        nextEnvironmentName = await loadEnvironmentsForRepository(
          nextRepository,
          selectedEnvironment,
        )
      }

      await refreshCurrentEntriesForSelection(
        nextRepository,
        nextEnvironmentName,
        {
          showSelectionError: false,
        },
      )
    } catch (error) {
      toast.error(variablesMessages.errors.refreshRepositoriesFailed, {
        description:
          error instanceof Error
            ? error.message
            : variablesMessages.errors.refreshRepositoriesFailed,
      })
    } finally {
      setIsRefreshingRepositories(false)
    }
  }

  async function loadGlobalSearchForRepository(repository: string) {
    if (!repository) {
      resetGlobalSearchData()
      return
    }

    await runManagedRequest({
      execute: async (signal) => {
        const repositoryVariablesPromise =
          repositoryVariablesRepository === repository
            ? Promise.resolve(repositoryVariables)
            : getRepositoryVariables({ data: { repository }, signal })
        const repositorySecretsPromise =
          repositorySecretsRepository === repository
            ? Promise.resolve(repositorySecrets)
            : getRepositorySecrets({ data: { repository }, signal })
        const environmentsPromise =
          environmentsRepository === repository
            ? Promise.resolve(environments)
            : getRepositoryEnvironments({ data: { repository }, signal })

        const [
          nextRepositoryVariables,
          nextRepositorySecrets,
          nextEnvironments,
        ] = await Promise.all([
          repositoryVariablesPromise,
          repositorySecretsPromise,
          environmentsPromise,
        ])

        const environmentEntries = await Promise.all(
          nextEnvironments.map(async (environment) => {
            const environmentKey = `${repository}:${environment.name}`
            const nextEnvironmentVariables =
              environmentVariablesKey === environmentKey
                ? environmentVariables
                : await getEnvironmentVariables({
                    data: {
                      environmentName: environment.name,
                      repository,
                    },
                    signal,
                  })
            const nextEnvironmentSecrets =
              environmentSecretsKey === environmentKey
                ? environmentSecrets
                : await getEnvironmentSecrets({
                    data: {
                      environmentName: environment.name,
                      repository,
                    },
                    signal,
                  })

            return {
              environment,
              secrets: nextEnvironmentSecrets,
              variables: nextEnvironmentVariables,
            }
          }),
        )

        return {
          environmentEntries,
          environments: nextEnvironments,
          repository,
          repositorySecrets: nextRepositorySecrets,
          repositoryVariables: nextRepositoryVariables,
          results: createGlobalSearchResults({
            environmentEntries,
            repository,
            repositorySecrets: nextRepositorySecrets,
            repositoryVariables: nextRepositoryVariables,
          }),
        } satisfies GlobalSearchLoadResult
      },
      kind: 'global-search',
      onError: (error) => {
        setGlobalSearchError(
          error instanceof Error
            ? error.message
            : variablesMessages.errors.refreshRepositoriesFailed,
        )
      },
      onFinish: () => setIsGlobalSearchLoading(false),
      onStart: () => {
        setGlobalSearchError(null)
        setGlobalSearchRepository(repository)
        setGlobalSearchResults([])
        setIsGlobalSearchLoading(true)
      },
      onSuccess: (payload) => {
        setGlobalSearchError(null)
        setGlobalSearchRepository(payload.repository)
        setGlobalSearchResults(payload.results)
        setRepositoryVariables(payload.repositoryVariables)
        setRepositoryVariablesRepository(payload.repository)
        setRepositorySecrets(payload.repositorySecrets)
        setRepositorySecretsRepository(payload.repository)
        setEnvironments(payload.environments)
        setEnvironmentsRepository(payload.repository)

        const selectedEnvironmentEntries = payload.environmentEntries.find(
          ({ environment }) =>
            environment.name === selectedEnvironmentRef.current,
        )

        if (selectedEnvironmentEntries) {
          setEnvironmentVariables(selectedEnvironmentEntries.variables)
          setEnvironmentVariablesKey(
            `${payload.repository}:${selectedEnvironmentEntries.environment.name}`,
          )
          setEnvironmentSecrets(selectedEnvironmentEntries.secrets)
          setEnvironmentSecretsKey(
            `${payload.repository}:${selectedEnvironmentEntries.environment.name}`,
          )
        }
      },
      requestKey: `${authIdentity}:${repository}`,
    })
  }

  async function applyRepositoryChange(nextRepository: string) {
    await applyRepositoryViewChange(
      {
        clearEnvironmentEditing,
        clearTableEditing,
        closeEntryEditorImmediately,
        closeEnvironmentCreateImmediately,
        resetRepositoryScopedData,
        setEnvironmentSelectionError,
        setRepositoryError,
      },
      {
        abortAllManagedRequests,
        selectedRepository,
        updateVariablesSearch,
      },
      nextRepository,
    )
  }

  async function applyScopeChange(nextScope: SettingsScope) {
    await applyScopeViewChange(
      {
        clearEnvironmentEditing,
        clearTableEditing,
        closeEntryEditorImmediately,
        closeEnvironmentCreateImmediately,
        setEnvironmentSelectionError,
        setRepositoryError,
      },
      {
        abortAllManagedRequests,
        activeScope,
        updateVariablesSearch,
      },
      nextScope,
    )
  }

  async function applyEnvironmentChange(nextEnvironment: string) {
    await applyEnvironmentViewChange(
      {
        clearTableEditing,
        closeEntryEditorImmediately,
        setEnvironmentSelectionError,
      },
      {
        selectedEnvironment,
        updateVariablesSearch,
      },
      nextEnvironment,
    )
  }

  async function syncViewToEntryEditorContext(context: EntryEditorContext) {
    if (context.repository !== selectedRepository) {
      await applyRepositoryChange(context.repository)
    }

    if (context.scope !== activeScope) {
      await applyScopeChange(context.scope)
    } else {
      await updateVariablesSearch(
        {
          query: undefined,
        },
        {
          replace: true,
        },
      )
    }

    if (
      isEnvironmentScope(context.scope) &&
      context.environmentName &&
      selectedEnvironment !== context.environmentName
    ) {
      await applyEnvironmentChange(context.environmentName)
    }
  }

  useEffect(() => {
    if (
      !statusAuthenticated ||
      !selectedRepository ||
      !trimmedGlobalSearchQuery
    ) {
      return
    }

    if (globalSearchRepository === selectedRepository) {
      return
    }

    void loadGlobalSearchForRepository(selectedRepository)
  }, [
    globalSearchRepository,
    selectedRepository,
    statusAuthenticated,
    trimmedGlobalSearchQuery,
  ])

  useEffect(() => {
    if (!statusAuthenticated || !selectedRepository) {
      return
    }

    if (activeScope === 'repository-variables') {
      if (repositoryVariablesRepository !== selectedRepository) {
        void loadRepositoryVariablesForRepository(selectedRepository)
      }
      return
    }

    if (activeScope === 'repository-secrets') {
      if (repositorySecretsRepository !== selectedRepository) {
        void loadRepositorySecretsForRepository(selectedRepository)
      }
      return
    }

    if (environmentsRepository !== selectedRepository) {
      void loadEnvironmentsForRepository(
        selectedRepository,
        selectedEnvironment,
      )
      return
    }

    if ((searchEnvironment ?? '') !== selectedEnvironment) {
      void navigate({
        replace: true,
        resetScroll: false,
        search: (previous) => ({
          ...previous,
          environment: selectedEnvironment || undefined,
        }),
      })
      return
    }

    if (!selectedEnvironment) {
      return
    }

    const environmentKey = `${selectedRepository}:${selectedEnvironment}`

    if (activeScope === 'environment-variables') {
      if (environmentVariablesKey !== environmentKey) {
        void loadEnvironmentVariablesForSelection(
          selectedRepository,
          selectedEnvironment,
        )
      }
      return
    }

    if (environmentSecretsKey !== environmentKey) {
      void loadEnvironmentSecretsForSelection(
        selectedRepository,
        selectedEnvironment,
      )
    }
  }, [
    activeScope,
    environmentSecretsKey,
    environmentVariablesKey,
    environmentsRepository,
    navigate,
    repositorySecretsRepository,
    repositoryVariablesRepository,
    searchEnvironment,
    selectedEnvironment,
    selectedRepository,
    statusAuthenticated,
  ])

  return {
    abortAllManagedRequests,
    applyEnvironmentChange,
    applyRepositoryChange,
    applyScopeChange,
    handleEnvironmentChange: applyEnvironmentChange,
    handleRepositoryChange: applyRepositoryChange,
    handleScopeChange: applyScopeChange,
    loadEnvironmentSecretsForSelection,
    loadEnvironmentVariablesForSelection,
    loadGlobalSearchForRepository,
    refreshCurrentEntries,
    refreshPageData,
    requestCloseEntryEditor,
    requestCloseEnvironmentCreate,
    resetGlobalSearchData,
    syncViewToEntryEditorContext,
  }
}

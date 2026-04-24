import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  createManagedRequestController,
  useManagedRequestSlots,
} from '#/hooks/use-managed-request-slots'
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
} from '#/features/variables/domain/variables-types'
import { getVariablesPagePrefetchCache } from '#/features/variables/state/variables-session-cache'
import type { VariablesStore } from '#/features/variables/state/variables-store'
import { requestCloseEntryEditor as requestCloseVariablesEntryEditor } from '#/features/variables/domain/variables-entry-editor'
import {
  applyEnvironmentViewChange,
  applyRepositoryViewChange,
  applyScopeViewChange,
} from '#/features/variables/domain/variables-view-switch'
import {
  createGlobalSearchResults,
  formatMessage,
  getScopeConfig,
  isEnvironmentScope,
  shouldPreserveSelectedEnvironmentOnScopeSwitch,
} from '#/features/variables/models/variables-helpers'
import { hasLoadedEntriesForScope } from '#/features/variables/models/variables-page-derivations'

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

const prefetchRequestKinds = [
  'repository-variables',
  'repository-secrets',
  'environments',
  'environment-variables',
  'environment-secrets',
] as const

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

type VariablesOrchestrationStore = Pick<
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
>

type VariablesOrchestrationContext = {
  activeScope: SettingsScope
  allowSnapshotRestore: boolean
  authIdentity: string
  searchEnvironment: string | undefined
  selectedEnvironment: string
  selectedRepository: string
  statusAuthenticated: boolean
  trimmedGlobalSearchQuery: string
  variablesMessages: VariablesMessages
}

type VariablesOrchestrationNavigation = {
  navigate: NavigateVariablesSearch
  updateVariablesSearch: UpdateVariablesSearch
}

type VariablesOrchestrationParams = {
  context: VariablesOrchestrationContext
  navigation: VariablesOrchestrationNavigation
  store: VariablesOrchestrationStore
}

export function useVariablesOrchestration({
  context: {
    activeScope,
    allowSnapshotRestore,
    authIdentity,
    searchEnvironment,
    selectedEnvironment,
    selectedRepository,
    statusAuthenticated,
    trimmedGlobalSearchQuery,
    variablesMessages,
  },
  navigation: { navigate, updateVariablesSearch },
  store: {
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
    repositorySecrets,
    repositorySecretsRepository,
    repositoryVariables,
    repositoryVariablesRepository,
    resetRepositoryScopedData,
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
  },
}: VariablesOrchestrationParams) {
  const selectedRepositoryRef = useRef(selectedRepository)
  const selectedEnvironmentRef = useRef(selectedEnvironment)
  const pageRefreshInFlightRef = useRef(false)
  const refreshPageDataRef = useRef<
    ((options?: { forceRefresh?: boolean }) => Promise<void>) | null
  >(null)
  const prefetchedCacheRef = useRef<ReturnType<
    typeof getVariablesPagePrefetchCache
  > | null>(null)

  if (prefetchedCacheRef.current === null) {
    prefetchedCacheRef.current = getVariablesPagePrefetchCache({
      allowSnapshotRestore,
      authIdentity,
    })
  }

  const prefetchRequestsRef = useRef(
    createManagedRequestController(prefetchRequestKinds),
  )
  const prefetchedRepositoryVariablesRef = useRef(
    prefetchedCacheRef.current.repositoryVariablesByRepository,
  )
  const prefetchedRepositorySecretsRef = useRef(
    prefetchedCacheRef.current.repositorySecretsByRepository,
  )
  const prefetchedEnvironmentsRef = useRef(
    prefetchedCacheRef.current.environmentsByRepository,
  )
  const prefetchedEnvironmentVariablesRef = useRef(
    prefetchedCacheRef.current.environmentVariablesByKey,
  )
  const prefetchedEnvironmentSecretsRef = useRef(
    prefetchedCacheRef.current.environmentSecretsByKey,
  )
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

  useEffect(() => {
    if (repositoryVariablesRepository) {
      prefetchedRepositoryVariablesRef.current.set(
        repositoryVariablesRepository,
        repositoryVariables,
      )
    }
  }, [repositoryVariables, repositoryVariablesRepository])

  useEffect(() => {
    if (repositorySecretsRepository) {
      prefetchedRepositorySecretsRef.current.set(
        repositorySecretsRepository,
        repositorySecrets,
      )
    }
  }, [repositorySecrets, repositorySecretsRepository])

  useEffect(() => {
    if (environmentsRepository) {
      prefetchedEnvironmentsRef.current.set(
        environmentsRepository,
        environments,
      )
    }
  }, [environments, environmentsRepository])

  useEffect(() => {
    if (environmentVariablesKey) {
      prefetchedEnvironmentVariablesRef.current.set(
        environmentVariablesKey,
        environmentVariables,
      )
    }
  }, [environmentVariables, environmentVariablesKey])

  useEffect(() => {
    if (environmentSecretsKey) {
      prefetchedEnvironmentSecretsRef.current.set(
        environmentSecretsKey,
        environmentSecrets,
      )
    }
  }, [environmentSecrets, environmentSecretsKey])

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

  function resolveStableEnvironmentName(
    repository: string,
    nextEnvironments: VariablesStore['environments'],
    preferredEnvironmentName = selectedEnvironment,
  ) {
    const latestSelectedEnvironment = selectedEnvironmentRef.current

    if (
      selectedRepositoryRef.current === repository &&
      latestSelectedEnvironment &&
      nextEnvironments.some(
        (environment) => environment.name === latestSelectedEnvironment,
      )
    ) {
      return latestSelectedEnvironment
    }

    if (
      nextEnvironments.some(
        (environment) => environment.name === preferredEnvironmentName,
      )
    ) {
      return preferredEnvironmentName
    }

    return nextEnvironments[0]?.name ?? ''
  }

  function applyLoadedEnvironmentsToStore(
    repository: string,
    nextEnvironments: VariablesStore['environments'],
    preferredEnvironmentName = selectedEnvironment,
    { syncSearch = true }: { syncSearch?: boolean } = {},
  ) {
    const stableSelectedEnvironment = resolveStableEnvironmentName(
      repository,
      nextEnvironments,
      preferredEnvironmentName,
    )

    setEnvironments(nextEnvironments)
    setEnvironmentsRepository(repository)
    setEnvironmentSelectionError(null)

    if (
      syncSearch &&
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

    return stableSelectedEnvironment
  }

  function hydratePrefetchedRepositoryVariables(repository: string) {
    const cachedVariables =
      prefetchedRepositoryVariablesRef.current.get(repository)

    if (!cachedVariables) {
      return false
    }

    setRepositoryVariables(cachedVariables)
    setRepositoryVariablesRepository(repository)

    return true
  }

  function hydratePrefetchedRepositorySecrets(repository: string) {
    const cachedSecrets = prefetchedRepositorySecretsRef.current.get(repository)

    if (!cachedSecrets) {
      return false
    }

    setRepositorySecrets(cachedSecrets)
    setRepositorySecretsRepository(repository)

    return true
  }

  function hydratePrefetchedEnvironments(
    repository: string,
    preferredEnvironmentName = selectedEnvironment,
  ) {
    const cachedEnvironments = prefetchedEnvironmentsRef.current.get(repository)

    if (!cachedEnvironments) {
      return ''
    }

    return applyLoadedEnvironmentsToStore(
      repository,
      cachedEnvironments,
      preferredEnvironmentName,
      {
        syncSearch: false,
      },
    )
  }

  function hydratePrefetchedEnvironmentVariables(
    repository: string,
    environmentName: string,
  ) {
    const environmentKey = `${repository}:${environmentName}`
    const cachedVariables =
      prefetchedEnvironmentVariablesRef.current.get(environmentKey)

    if (!cachedVariables) {
      return false
    }

    setEnvironmentVariables(cachedVariables)
    setEnvironmentVariablesKey(environmentKey)

    return true
  }

  function hydratePrefetchedEnvironmentSecrets(
    repository: string,
    environmentName: string,
  ) {
    const environmentKey = `${repository}:${environmentName}`
    const cachedSecrets =
      prefetchedEnvironmentSecretsRef.current.get(environmentKey)

    if (!cachedSecrets) {
      return false
    }

    setEnvironmentSecrets(cachedSecrets)
    setEnvironmentSecretsKey(environmentKey)

    return true
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

  async function loadRepositoryVariablesForRepository(
    repository: string,
    {
      forceRefresh = false,
      prefetchOnly = false,
    }: { forceRefresh?: boolean; prefetchOnly?: boolean } = {},
  ) {
    if (!repository) {
      if (!prefetchOnly) {
        abortManagedRequest('repository-variables')
        syncEntryRefreshingState()
        setRepositoryVariables([])
        setRepositoryVariablesRepository('')
      }
      return
    }

    const cachedVariables =
      prefetchedRepositoryVariablesRef.current.get(repository)

    if (cachedVariables && !forceRefresh) {
      if (!prefetchOnly) {
        setRepositoryVariables(cachedVariables)
        setRepositoryVariablesRepository(repository)
      }
      return
    }

    const runRequest = prefetchOnly
      ? prefetchRequestsRef.current.runManagedRequest
      : runManagedRequest

    await runRequest({
      execute: (signal) =>
        getRepositoryVariables({
          data: { repository },
          signal,
        }),
      kind: 'repository-variables',
      onError: prefetchOnly
        ? undefined
        : (error) => {
            showLoadError(
              getScopeConfig(variablesMessages, 'repository-variables')
                .loadLabel,
              error,
            )
          },
      onFinish: prefetchOnly ? undefined : syncEntryRefreshingState,
      onStart: prefetchOnly ? undefined : () => setIsRefreshingEntries(true),
      onSuccess: (nextVariables) => {
        prefetchedRepositoryVariablesRef.current.set(repository, nextVariables)

        if (!prefetchOnly) {
          setRepositoryVariables(nextVariables)
          setRepositoryVariablesRepository(repository)
        }
      },
      requestKey: repository,
    })
  }

  async function loadRepositorySecretsForRepository(
    repository: string,
    {
      forceRefresh = false,
      prefetchOnly = false,
    }: { forceRefresh?: boolean; prefetchOnly?: boolean } = {},
  ) {
    if (!repository) {
      if (!prefetchOnly) {
        abortManagedRequest('repository-secrets')
        syncEntryRefreshingState()
        setRepositorySecrets([])
        setRepositorySecretsRepository('')
      }
      return
    }

    const cachedSecrets = prefetchedRepositorySecretsRef.current.get(repository)

    if (cachedSecrets && !forceRefresh) {
      if (!prefetchOnly) {
        setRepositorySecrets(cachedSecrets)
        setRepositorySecretsRepository(repository)
      }
      return
    }

    const runRequest = prefetchOnly
      ? prefetchRequestsRef.current.runManagedRequest
      : runManagedRequest

    await runRequest({
      execute: (signal) =>
        getRepositorySecrets({
          data: { repository },
          signal,
        }),
      kind: 'repository-secrets',
      onError: prefetchOnly
        ? undefined
        : (error) => {
            showLoadError(
              getScopeConfig(variablesMessages, 'repository-secrets').loadLabel,
              error,
            )
          },
      onFinish: prefetchOnly ? undefined : syncEntryRefreshingState,
      onStart: prefetchOnly ? undefined : () => setIsRefreshingEntries(true),
      onSuccess: (nextSecrets) => {
        prefetchedRepositorySecretsRef.current.set(repository, nextSecrets)

        if (!prefetchOnly) {
          setRepositorySecrets(nextSecrets)
          setRepositorySecretsRepository(repository)
        }
      },
      requestKey: repository,
    })
  }

  async function loadEnvironmentsForRepository(
    repository: string,
    preferredEnvironmentName = selectedEnvironment,
    {
      forceRefresh = false,
      prefetchOnly = false,
      syncSearch = true,
    }: {
      forceRefresh?: boolean
      prefetchOnly?: boolean
      syncSearch?: boolean
    } = {},
  ) {
    if (!repository) {
      if (!prefetchOnly) {
        abortManagedRequest('environments')
        syncEnvironmentRefreshingState()
        setEnvironments([])
        setEnvironmentsRepository('')
      }
      return ''
    }

    const cachedEnvironments = prefetchedEnvironmentsRef.current.get(repository)

    if (cachedEnvironments && !forceRefresh) {
      return prefetchOnly
        ? resolveStableEnvironmentName(
            repository,
            cachedEnvironments,
            preferredEnvironmentName,
          )
        : applyLoadedEnvironmentsToStore(
            repository,
            cachedEnvironments,
            preferredEnvironmentName,
            { syncSearch },
          )
    }

    let resolvedEnvironmentName = ''

    const runRequest = prefetchOnly
      ? prefetchRequestsRef.current.runManagedRequest
      : runManagedRequest

    await runRequest({
      execute: (signal) =>
        getRepositoryEnvironments({
          data: { repository },
          signal,
        }),
      kind: 'environments',
      onError: prefetchOnly
        ? undefined
        : (error) => {
            showLoadError(variablesMessages.environmentLabel, error)
          },
      onFinish: prefetchOnly ? undefined : syncEnvironmentRefreshingState,
      onStart: prefetchOnly
        ? undefined
        : () => setIsRefreshingEnvironments(true),
      onSuccess: (nextEnvironments) => {
        prefetchedEnvironmentsRef.current.set(repository, nextEnvironments)
        resolvedEnvironmentName = prefetchOnly
          ? resolveStableEnvironmentName(
              repository,
              nextEnvironments,
              preferredEnvironmentName,
            )
          : applyLoadedEnvironmentsToStore(
              repository,
              nextEnvironments,
              preferredEnvironmentName,
              { syncSearch },
            )
      },
      requestKey: repository,
    })

    return resolvedEnvironmentName
  }

  async function loadEnvironmentVariablesForSelection(
    repository: string,
    nextEnvironmentName: string,
    {
      forceRefresh = false,
      prefetchOnly = false,
    }: { forceRefresh?: boolean; prefetchOnly?: boolean } = {},
  ) {
    if (!repository || !nextEnvironmentName) {
      if (!prefetchOnly) {
        abortManagedRequest('environment-variables')
        syncEntryRefreshingState()
        setEnvironmentVariables([])
        setEnvironmentVariablesKey('')
      }
      return
    }

    const environmentKey = `${repository}:${nextEnvironmentName}`
    const cachedVariables =
      prefetchedEnvironmentVariablesRef.current.get(environmentKey)

    if (cachedVariables && !forceRefresh) {
      if (!prefetchOnly) {
        setEnvironmentVariables(cachedVariables)
        setEnvironmentVariablesKey(environmentKey)
      }
      return
    }

    const runRequest = prefetchOnly
      ? prefetchRequestsRef.current.runManagedRequest
      : runManagedRequest

    await runRequest({
      execute: (signal) =>
        getEnvironmentVariables({
          data: {
            environmentName: nextEnvironmentName,
            repository,
          },
          signal,
        }),
      kind: 'environment-variables',
      onError: prefetchOnly
        ? undefined
        : (error) => {
            showLoadError(
              getScopeConfig(variablesMessages, 'environment-variables')
                .loadLabel,
              error,
            )
          },
      onFinish: prefetchOnly ? undefined : syncEntryRefreshingState,
      onStart: prefetchOnly ? undefined : () => setIsRefreshingEntries(true),
      onSuccess: (nextVariables) => {
        prefetchedEnvironmentVariablesRef.current.set(
          environmentKey,
          nextVariables,
        )

        if (!prefetchOnly) {
          setEnvironmentVariables(nextVariables)
          setEnvironmentVariablesKey(environmentKey)
        }
      },
      requestKey: environmentKey,
    })
  }

  async function loadEnvironmentSecretsForSelection(
    repository: string,
    nextEnvironmentName: string,
    {
      forceRefresh = false,
      prefetchOnly = false,
    }: { forceRefresh?: boolean; prefetchOnly?: boolean } = {},
  ) {
    if (!repository || !nextEnvironmentName) {
      if (!prefetchOnly) {
        abortManagedRequest('environment-secrets')
        syncEntryRefreshingState()
        setEnvironmentSecrets([])
        setEnvironmentSecretsKey('')
      }
      return
    }

    const environmentKey = `${repository}:${nextEnvironmentName}`
    const cachedSecrets =
      prefetchedEnvironmentSecretsRef.current.get(environmentKey)

    if (cachedSecrets && !forceRefresh) {
      if (!prefetchOnly) {
        setEnvironmentSecrets(cachedSecrets)
        setEnvironmentSecretsKey(environmentKey)
      }
      return
    }

    const runRequest = prefetchOnly
      ? prefetchRequestsRef.current.runManagedRequest
      : runManagedRequest

    await runRequest({
      execute: (signal) =>
        getEnvironmentSecrets({
          data: {
            environmentName: nextEnvironmentName,
            repository,
          },
          signal,
        }),
      kind: 'environment-secrets',
      onError: prefetchOnly
        ? undefined
        : (error) => {
            showLoadError(
              getScopeConfig(variablesMessages, 'environment-secrets')
                .loadLabel,
              error,
            )
          },
      onFinish: prefetchOnly ? undefined : syncEntryRefreshingState,
      onStart: prefetchOnly ? undefined : () => setIsRefreshingEntries(true),
      onSuccess: (nextSecrets) => {
        prefetchedEnvironmentSecretsRef.current.set(environmentKey, nextSecrets)

        if (!prefetchOnly) {
          setEnvironmentSecrets(nextSecrets)
          setEnvironmentSecretsKey(environmentKey)
        }
      },
      requestKey: environmentKey,
    })
  }

  async function prefetchScope(nextScope: SettingsScope) {
    if (
      !statusAuthenticated ||
      !selectedRepository ||
      nextScope === activeScope
    ) {
      return
    }

    if (nextScope === 'repository-variables') {
      await loadRepositoryVariablesForRepository(selectedRepository, {
        prefetchOnly: true,
      })

      hydratePrefetchedRepositoryVariables(selectedRepository)
      return
    }

    if (nextScope === 'repository-secrets') {
      await loadRepositorySecretsForRepository(selectedRepository, {
        prefetchOnly: true,
      })

      hydratePrefetchedRepositorySecrets(selectedRepository)
      return
    }

    const prefetchedEnvironmentName = await loadEnvironmentsForRepository(
      selectedRepository,
      selectedEnvironment,
      {
        prefetchOnly: true,
        syncSearch: false,
      },
    )

    const hydratedEnvironmentName = hydratePrefetchedEnvironments(
      selectedRepository,
      selectedEnvironment,
    )

    if (!prefetchedEnvironmentName || !hydratedEnvironmentName) {
      return
    }

    if (nextScope === 'environment-variables') {
      await loadEnvironmentVariablesForSelection(
        selectedRepository,
        prefetchedEnvironmentName,
        {
          prefetchOnly: true,
        },
      )

      hydratePrefetchedEnvironmentVariables(
        selectedRepository,
        hydratedEnvironmentName,
      )
      return
    }

    await loadEnvironmentSecretsForSelection(
      selectedRepository,
      prefetchedEnvironmentName,
      {
        prefetchOnly: true,
      },
    )

    hydratePrefetchedEnvironmentSecrets(
      selectedRepository,
      hydratedEnvironmentName,
    )
  }

  async function refreshCurrentEntriesForSelection(
    repository: string,
    targetEnvironmentName: string,
    {
      forceRefresh = false,
      showSelectionError = true,
    }: {
      forceRefresh?: boolean
      showSelectionError?: boolean
    } = {},
  ) {
    if (!repository) {
      return
    }

    if (activeScope === 'repository-variables') {
      await loadRepositoryVariablesForRepository(repository, { forceRefresh })
      return
    }

    if (activeScope === 'repository-secrets') {
      await loadRepositorySecretsForRepository(repository, { forceRefresh })
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
        { forceRefresh },
      )
      return
    }

    await loadEnvironmentSecretsForSelection(
      repository,
      targetEnvironmentName,
      {
        forceRefresh,
      },
    )
  }

  async function refreshCurrentEntries({
    forceRefresh = false,
  }: {
    forceRefresh?: boolean
  } = {}) {
    await refreshCurrentEntriesForSelection(
      selectedRepository,
      selectedEnvironment,
      { forceRefresh },
    )
  }

  async function refreshPageData({
    forceRefresh = false,
  }: {
    forceRefresh?: boolean
  } = {}) {
    if (pageRefreshInFlightRef.current) {
      return
    }

    pageRefreshInFlightRef.current = true
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
          { forceRefresh },
        )
      }

      await refreshCurrentEntriesForSelection(
        nextRepository,
        nextEnvironmentName,
        {
          forceRefresh,
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
      pageRefreshInFlightRef.current = false
    }
  }

  refreshPageDataRef.current = refreshPageData

  async function loadGlobalSearchForRepository(repository: string) {
    if (!repository) {
      resetGlobalSearchData()
      return
    }

    await runManagedRequest({
      execute: async (signal) => {
        const repositoryVariablesPromise = hasLoadedEntriesForScope({
          activeScope: 'repository-variables',
          environmentSecretsKey,
          environmentVariablesKey,
          repositorySecretsRepository,
          repositoryVariablesRepository,
          selectedEnvironment: '',
          selectedRepository: repository,
        })
          ? Promise.resolve(repositoryVariables)
          : getRepositoryVariables({ data: { repository }, signal })
        const repositorySecretsPromise = hasLoadedEntriesForScope({
          activeScope: 'repository-secrets',
          environmentSecretsKey,
          environmentVariablesKey,
          repositorySecretsRepository,
          repositoryVariablesRepository,
          selectedEnvironment: '',
          selectedRepository: repository,
        })
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
            const nextEnvironmentVariables = hasLoadedEntriesForScope({
              activeScope: 'environment-variables',
              environmentSecretsKey,
              environmentVariablesKey,
              repositorySecretsRepository,
              repositoryVariablesRepository,
              selectedEnvironment: environment.name,
              selectedRepository: repository,
            })
              ? environmentVariables
              : await getEnvironmentVariables({
                  data: {
                    environmentName: environment.name,
                    repository,
                  },
                  signal,
                })
            const nextEnvironmentSecrets = hasLoadedEntriesForScope({
              activeScope: 'environment-secrets',
              environmentSecretsKey,
              environmentVariablesKey,
              repositorySecretsRepository,
              repositoryVariablesRepository,
              selectedEnvironment: environment.name,
              selectedRepository: repository,
            })
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
    const preserveEnvironmentOnScopeSwitch =
      shouldPreserveSelectedEnvironmentOnScopeSwitch({
        nextScope,
        selectedEnvironment,
      })

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
        preserveEnvironmentOnScopeSwitch,
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
    handleScopePrefetch: prefetchScope,
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

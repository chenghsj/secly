import {
  Link,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import type { SearchableSelectItem } from '#/components/ui/searchable-select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useAppPreferences } from '../components/app/app-settings-provider'
import {
  defaultVariablesEntrySort,
  getNextVariablesEntrySort,
  mergeVariablesSearchUpdate,
  validateVariablesSearch,
} from '#/lib/variables-route-search'
import type {
  SettingsScope,
  VariablesEntrySortDirection,
  VariablesEntrySortField,
  VariablesSearch,
} from '#/lib/variables-route-search'
import {
  compareSettingsEntries,
  formatMessage,
  getPendingVariablesMessages,
  getScopeConfig,
  getTargetLabel,
  getVariablesAuthIdentity,
  getVariablesPageDataSnapshotKey,
  isEnvironmentScope,
  isSecretScope,
  scopeMessageKeys,
  scopeTabDisplayOrder,
  upsertEntryList,
} from '#/features/variables/variables-selectors'
import { createEnvironmentForRepository } from '#/features/variables/variables-actions'
import {
  VariablesBulkEntryPanel,
  LoadingTable,
  VariablesDeleteConfirmDialog,
  VariablesEntriesPanel,
  VariablesEnvironmentCreateDialog,
  VariablesEntryEditorDialog,
  VariablesSingleEntryForm,
  VariablesGlobalSearchDialog,
  VariablesTargetPanel,
} from '#/features/variables/variables-components'
import {
  openEntryEditorForScope,
  startCreateEntryEditor,
} from '#/features/variables/variables-entry-editor'
import { openGlobalSearchResultInEditor } from '#/features/variables/variables-global-search'
import { useVariablesDeleteController } from '#/features/variables/use-variables-delete-controller'
import { useVariablesEntryEditorController } from '#/features/variables/use-variables-entry-editor-controller'
import { useVariablesOrchestration } from '#/features/variables/use-variables-orchestration'
import { useVariablesPageViewModels } from '#/features/variables/use-variables-page-view-models'
import {
  VariablesStoreProvider,
  createVariablesStoreInitialState,
  useVariablesStore,
} from '#/features/variables/variables-store'
import type {
  GlobalSearchResult,
  SettingsEntry,
  VariablesLoaderData,
  VariablesPageDataSnapshot,
} from '#/features/variables/variables-types'
import {
  getEnvironmentSecrets,
  getEnvironmentVariables,
  getRepositoryEnvironments,
  getRepositorySecrets,
} from '../server/gh-actions-settings.functions'
import { refreshLocalGhAuthStatus } from '../server/gh-auth.functions'
import type { GhAuthStatus } from '../server/gh-auth.server'
import type { GhEnvironmentSummary } from '../server/gh-actions-settings.server'
import {
  getManageableRepositories,
  getRepositoryVariables,
} from '../server/gh-repository-variables.functions'
import type { GhRepositorySummary } from '../server/gh-repository-variables.server'

const variablesPageDataSnapshots = new Map<string, VariablesPageDataSnapshot>()

function createEmptyVariablesLoaderData(
  status: GhAuthStatus,
): VariablesLoaderData {
  return {
    environmentSecrets: [],
    environmentSecretsKey: '',
    environmentVariables: [],
    environmentVariablesKey: '',
    environments: [],
    environmentsRepository: '',
    initialRepository: '',
    repositories: [],
    repositorySecrets: [],
    repositorySecretsRepository: '',
    repositoryVariables: [],
    repositoryVariablesRepository: '',
    status,
  }
}

function resolveInitialRepository(
  repositories: GhRepositorySummary[],
  requestedRepository?: string,
) {
  if (
    requestedRepository &&
    repositories.some(
      (repository) => repository.nameWithOwner === requestedRepository,
    )
  ) {
    return requestedRepository
  }

  return repositories[0]?.nameWithOwner ?? ''
}

function resolveInitialEnvironment(
  environments: GhEnvironmentSummary[],
  requestedEnvironment?: string,
) {
  if (
    requestedEnvironment &&
    environments.some(
      (environment) => environment.name === requestedEnvironment,
    )
  ) {
    return requestedEnvironment
  }

  return environments[0]?.name ?? ''
}

async function loadVariablesRouteData(
  search: VariablesSearch,
): Promise<VariablesLoaderData> {
  const status = await refreshLocalGhAuthStatus()

  if (!status.authenticated) {
    throw redirect({ to: '/connect' })
  }

  const repositories = await getManageableRepositories()
  const initialRepository = resolveInitialRepository(
    repositories,
    search.repository,
  )
  const data: VariablesLoaderData = {
    ...createEmptyVariablesLoaderData(status),
    initialRepository,
    repositories,
  }

  if (!initialRepository) {
    return data
  }

  const activeScope = search.scope ?? 'repository-variables'

  if (activeScope === 'repository-variables') {
    data.repositoryVariables = await getRepositoryVariables({
      data: {
        repository: initialRepository,
      },
    })
    data.repositoryVariablesRepository = initialRepository
    return data
  }

  if (activeScope === 'repository-secrets') {
    data.repositorySecrets = await getRepositorySecrets({
      data: {
        repository: initialRepository,
      },
    })
    data.repositorySecretsRepository = initialRepository
    return data
  }

  data.environments = await getRepositoryEnvironments({
    data: {
      repository: initialRepository,
    },
  })
  data.environmentsRepository = initialRepository

  const initialEnvironment = resolveInitialEnvironment(
    data.environments,
    search.environment,
  )

  if (!initialEnvironment) {
    return data
  }

  if (activeScope === 'environment-variables') {
    data.environmentVariables = await getEnvironmentVariables({
      data: {
        environmentName: initialEnvironment,
        repository: initialRepository,
      },
    })
    data.environmentVariablesKey = `${initialRepository}:${initialEnvironment}`
    return data
  }

  data.environmentSecrets = await getEnvironmentSecrets({
    data: {
      environmentName: initialEnvironment,
      repository: initialRepository,
    },
  })
  data.environmentSecretsKey = `${initialRepository}:${initialEnvironment}`

  return data
}

export const Route = createFileRoute('/variables')({
  validateSearch: validateVariablesSearch,
  staleTime: Infinity,
  gcTime: Infinity,
  loader: async ({ location }) => {
    const search = validateVariablesSearch(
      location.search as Record<string, unknown>,
    )

    return loadVariablesRouteData(search)
  },
  pendingComponent: VariablesRoutePending,
  wrapInSuspense: true,
  component: VariablesRouteComponent,
})

function VariablesRouteComponent() {
  const loaderData = Route.useLoaderData()
  const { status } = loaderData
  const authIdentity = getVariablesAuthIdentity(status)
  const didInvalidateRef = useRef(false)

  // Only show skeleton when the match is being re-run due to invalidation
  // (e.g. account switch). Search-param changes such as switching tab/scope
  // do not invalidate the match, so the skeleton does not flash on tab
  // switches.
  const isInvalidating = useRouterState({
    select: (state) =>
      state.matches.some(
        (match) => match.routeId === '/variables' && match.invalid === true,
      ),
  })

  if (isInvalidating) {
    didInvalidateRef.current = true
    return <VariablesRoutePending />
  }

  const allowSnapshotRestore = !didInvalidateRef.current

  didInvalidateRef.current = false

  return (
    <VariablesPage
      allowSnapshotRestore={allowSnapshotRestore}
      key={authIdentity}
    />
  )
}

function VariablesPage({
  allowSnapshotRestore,
}: {
  allowSnapshotRestore: boolean
}) {
  const loaderData = Route.useLoaderData()
  const { status } = loaderData
  const authIdentity = getVariablesAuthIdentity(status)
  const search = Route.useSearch()
  const initialState = useMemo(
    () =>
      createVariablesStoreInitialState({
        initialDataSnapshot: allowSnapshotRestore
          ? (variablesPageDataSnapshots.get(
              getVariablesPageDataSnapshotKey(authIdentity, search),
            ) ?? null)
          : null,
        loaderData,
      }),
    [allowSnapshotRestore, authIdentity, loaderData, search],
  )

  return (
    <VariablesStoreProvider initialState={initialState}>
      <VariablesPageContent
        authIdentity={authIdentity}
        dataSnapshotKey={getVariablesPageDataSnapshotKey(authIdentity, search)}
        loaderData={loaderData}
        search={search}
      />
    </VariablesStoreProvider>
  )
}

function VariablesPageContent({
  authIdentity,
  dataSnapshotKey,
  loaderData,
  search,
}: {
  authIdentity: string
  dataSnapshotKey: string
  loaderData: VariablesLoaderData
  search: VariablesSearch
}) {
  const navigate = Route.useNavigate()
  const { locale, messages } = useAppPreferences()
  const { status } = loaderData
  const {
    bulkInput,
    bulkInputError,
    clearEntryEditorDrafts,
    clearEnvironmentEditing,
    clearGlobalSearchData,
    clearTableEditing,
    closeEntryEditorImmediately,
    closeEnvironmentCreateImmediately,
    deleteConfirmationValue,
    editingEntryName,
    environmentName,
    environmentNameError,
    environmentSecrets,
    environmentSecretsKey,
    environmentSelectionError,
    environmentVariables,
    environmentVariablesKey,
    environments,
    environmentsRepository,
    entryEditorContext,
    globalSearchError,
    globalSearchQuery,
    globalSearchRepository,
    globalSearchResults,
    isBulkSaving,
    isCreatingEnvironment,
    isDeletingEntries,
    isDeletingEnvironment,
    isEntryEditorOpen,
    isEnvironmentCreateOpen,
    isEnvironmentEditing,
    isGlobalSearchDialogOpen,
    isGlobalSearchLoading,
    isRefreshingEntries,
    isRefreshingEnvironments,
    isRefreshingRepositories,
    isSaving,
    isTableEditing,
    name,
    nameError,
    pendingDelete,
    repositories,
    repositoryError,
    repositorySecrets,
    repositorySecretsRepository,
    repositoryVariables,
    repositoryVariablesRepository,
    resetRepositoryScopedData,
    selectedEntryNames,
    setBulkInput,
    setBulkInputError,
    setDeleteConfirmationValue,
    setEditingEntryName,
    setEnvironmentName,
    setEnvironmentNameError,
    setEnvironmentSecrets,
    setEnvironmentSecretsKey,
    setEnvironmentSelectionError,
    setEnvironmentVariables,
    setEnvironmentVariablesKey,
    setEnvironments,
    setEnvironmentsRepository,
    setEntryEditorContext,
    setGlobalSearchError,
    setGlobalSearchQuery,
    setGlobalSearchRepository,
    setGlobalSearchResults,
    setIsBulkSaving,
    setIsCreatingEnvironment,
    setIsDeletingEntries,
    setIsDeletingEnvironment,
    setIsEntryEditorOpen,
    setIsEnvironmentCreateOpen,
    setIsEnvironmentEditing,
    setIsGlobalSearchDialogOpen,
    setIsGlobalSearchLoading,
    setIsRefreshingEntries,
    setIsRefreshingEnvironments,
    setIsRefreshingRepositories,
    setIsSaving,
    setIsTableEditing,
    setName,
    setNameError,
    setPendingDelete,
    setRepositories,
    setRepositoryError,
    setRepositorySecrets,
    setRepositorySecretsRepository,
    setRepositoryVariables,
    setRepositoryVariablesRepository,
    setSelectedEntryNames,
    setShouldRestoreGlobalSearchAfterEditorClose,
    setValue,
    setValueError,
    shouldRestoreGlobalSearchAfterEditorClose,
    toggleEntrySelection,
    value,
    valueError,
  } = useVariablesStore((state) => state)
  const variablesMessages = messages.variables
  const selectedRepository =
    search.repository &&
    repositories.some(
      (repository) => repository.nameWithOwner === search.repository,
    )
      ? search.repository
      : (repositories[0]?.nameWithOwner ?? loaderData.initialRepository)
  const activeScope = search.scope ?? 'repository-variables'
  const selectedEnvironment =
    search.environment &&
    environments.some((environment) => environment.name === search.environment)
      ? search.environment
      : environmentsRepository === selectedRepository
        ? activeScope === 'environment-variables'
          ? (environments.find((environment) => environment.variableCount > 0)
              ?.name ?? '')
          : (environments[0]?.name ?? '')
        : ''
  const repositoryOptions = useMemo(
    () => repositories.map((repository) => repository.nameWithOwner),
    [repositories],
  )
  const environmentOptions = useMemo<SearchableSelectItem[]>(
    () => environments.map((environment) => environment.name),
    [environments],
  )
  const searchQuery = search.query ?? ''
  const trimmedGlobalSearchQuery = globalSearchQuery.trim()
  const activeTab = search.tab ?? 'single'
  const scopeConfig = getScopeConfig(variablesMessages, activeScope)
  const entryEditorScope = entryEditorContext?.scope ?? activeScope
  const entryEditorRepository =
    entryEditorContext?.repository ?? selectedRepository
  const entryEditorEnvironment = isEnvironmentScope(entryEditorScope)
    ? (entryEditorContext?.environmentName ?? selectedEnvironment)
    : ''
  const entryEditorScopeConfig = getScopeConfig(
    variablesMessages,
    entryEditorScope,
  )
  const scopeEntryPlural = scopeConfig.entryPluralLabel
  const currentEntries = useMemo<SettingsEntry[]>(() => {
    switch (activeScope) {
      case 'repository-variables':
        return repositoryVariables
      case 'repository-secrets':
        return repositorySecrets
      case 'environment-variables':
        return environmentVariables
      case 'environment-secrets':
        return environmentSecrets
      default:
        return []
    }
  }, [
    activeScope,
    environmentSecrets,
    environmentVariables,
    repositorySecrets,
    repositoryVariables,
  ])
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return currentEntries
    }

    return currentEntries.filter((entry) => {
      const searchableValue = entry.value ?? ''
      const searchableVisibility = entry.visibility ?? ''

      return (
        entry.name.toLowerCase().includes(query) ||
        searchableValue.toLowerCase().includes(query) ||
        searchableVisibility.toLowerCase().includes(query)
      )
    })
  }, [currentEntries, searchQuery])
  const filteredGlobalSearchResults = useMemo(() => {
    const query = trimmedGlobalSearchQuery.toLowerCase()

    if (!query || globalSearchRepository !== selectedRepository) {
      return []
    }

    return globalSearchResults.filter(
      (result) =>
        result.repository === selectedRepository &&
        result.searchText.includes(query),
    )
  }, [
    globalSearchRepository,
    globalSearchResults,
    selectedRepository,
    trimmedGlobalSearchQuery,
  ])
  const entryTableSort = search.sort ?? defaultVariablesEntrySort
  const [entrySortField, entrySortDirection] = entryTableSort.split(':') as [
    VariablesEntrySortField,
    VariablesEntrySortDirection,
  ]
  const entrySortCollator = useMemo(
    () => new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }),
    [locale],
  )
  const sortedFilteredEntries = useMemo(
    () =>
      [...filteredEntries].sort((left, right) =>
        compareSettingsEntries(left, right, {
          collator: entrySortCollator,
          direction: entrySortDirection,
          field: entrySortField,
          isSecretScopeActive: isSecretScope(activeScope),
        }),
      ),
    [
      activeScope,
      entrySortCollator,
      entrySortDirection,
      entrySortField,
      filteredEntries,
    ],
  )
  const selectedEntryNameSet = useMemo(
    () => new Set(selectedEntryNames),
    [selectedEntryNames],
  )
  const hasSelectedEntries = selectedEntryNames.length > 0
  const allFilteredEntriesSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((entry) => selectedEntryNameSet.has(entry.name))
  const hasPartiallySelectedEntries =
    !allFilteredEntriesSelected &&
    filteredEntries.some((entry) => selectedEntryNameSet.has(entry.name))

  async function updateVariablesSearch(
    nextValues: Partial<VariablesSearch>,
    { replace = false }: { replace?: boolean } = {},
  ) {
    await navigate({
      replace,
      resetScroll: false,
      search: (previous) => mergeVariablesSearchUpdate(previous, nextValues),
    })
  }

  const {
    handleEnvironmentChange,
    handleRepositoryChange,
    handleScopeChange,
    loadEnvironmentSecretsForSelection,
    loadEnvironmentVariablesForSelection,
    loadGlobalSearchForRepository,
    refreshCurrentEntries,
    refreshPageData,
    requestCloseEntryEditor,
    requestCloseEnvironmentCreate,
    resetGlobalSearchData,
  } = useVariablesOrchestration({
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
    searchEnvironment: search.environment,
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
    statusAuthenticated: status.authenticated,
    trimmedGlobalSearchQuery,
    updateVariablesSearch,
    variablesMessages,
  })

  function handleEntrySortChange(field: VariablesEntrySortField) {
    void updateVariablesSearch(
      {
        sort: getNextVariablesEntrySort(entryTableSort, field),
      },
      {
        replace: true,
      },
    )
  }

  const hasLoadedCurrentEntries =
    activeScope === 'repository-variables'
      ? repositoryVariablesRepository === selectedRepository
      : activeScope === 'repository-secrets'
        ? repositorySecretsRepository === selectedRepository
        : activeScope === 'environment-variables'
          ? environmentVariablesKey ===
            `${selectedRepository}:${selectedEnvironment}`
          : environmentSecretsKey ===
            `${selectedRepository}:${selectedEnvironment}`
  const currentTargetLabel = selectedRepository
    ? isEnvironmentScope(activeScope) && selectedEnvironment
      ? `${selectedRepository} / ${selectedEnvironment}`
      : selectedRepository
    : null

  useEffect(() => {
    variablesPageDataSnapshots.set(dataSnapshotKey, {
      environmentSecrets,
      environmentSecretsKey,
      environmentVariables,
      environmentVariablesKey,
      environments,
      environmentsRepository,
      initialRepository: selectedRepository || loaderData.initialRepository,
      repositories,
      repositorySecrets,
      repositorySecretsRepository,
      repositoryVariables,
      repositoryVariablesRepository,
    })
  }, [
    dataSnapshotKey,
    environmentSecrets,
    environmentSecretsKey,
    environmentVariables,
    environmentVariablesKey,
    environments,
    environmentsRepository,
    loaderData.initialRepository,
    repositories,
    repositorySecrets,
    repositorySecretsRepository,
    repositoryVariables,
    repositoryVariablesRepository,
    selectedRepository,
  ])

  const listEmptyTitle = formatMessage(variablesMessages.noEntriesTitle, {
    entries: scopeEntryPlural,
  })
  const listEmptyDescription = selectedRepository
    ? formatMessage(variablesMessages.noEntriesDescription, {
        entry: scopeConfig.entryLabel,
        target: getTargetLabel(
          selectedRepository,
          selectedEnvironment,
          activeScope,
        ),
      })
    : variablesMessages.selectRepositoryDescription
  const noMatchesTitle = formatMessage(variablesMessages.noMatchesTitle, {
    entries: scopeEntryPlural,
  })

  function startCreateEntry() {
    setRepositoryError(null)
    setEnvironmentSelectionError(null)

    if (!selectedRepository) {
      setRepositoryError(
        formatMessage(
          variablesMessages.validation.selectRepositoryBeforeSaving,
          {
            entry: scopeConfig.entryLabel,
          },
        ),
      )
      return
    }

    if (isEnvironmentScope(activeScope) && !selectedEnvironment) {
      setEnvironmentSelectionError(
        variablesMessages.validation.selectEnvironmentBeforeSaving,
      )
      return
    }

    startCreateEntryEditor(
      {
        clearEntryEditorDrafts,
        setEntryEditorContext,
        setIsEntryEditorOpen,
        setIsGlobalSearchDialogOpen,
        setShouldRestoreGlobalSearchAfterEditorClose,
      },
      {
        activeScope,
        selectedEnvironment,
        selectedRepository,
      },
    )
  }

  function openEnvironmentCreate() {
    setRepositoryError(null)
    setEnvironmentNameError(null)

    if (!selectedRepository) {
      setRepositoryError(
        variablesMessages.validation.selectRepositoryBeforeCreateEnvironment,
      )
      return
    }

    setEnvironmentName('')
    setIsEnvironmentCreateOpen(true)
  }

  function applyEditEntryForScope(entry: SettingsEntry, scope: SettingsScope) {
    setRepositoryError(null)
    setEnvironmentSelectionError(null)

    openEntryEditorForScope(
      {
        clearEntryEditorDrafts,
        setEditingEntryName,
        setEntryEditorContext,
        setIsEntryEditorOpen,
        setIsGlobalSearchDialogOpen,
        setName,
        setShouldRestoreGlobalSearchAfterEditorClose,
        setValue,
      },
      {
        activeScope,
        entry,
        isGlobalSearchDialogOpen,
        scope,
        selectedEnvironment,
        selectedRepository,
      },
    )
  }

  function startEditingEntry(entry: SettingsEntry) {
    if (editingEntryName === entry.name) {
      return
    }

    void applyEditEntryForScope(entry, activeScope)
  }

  async function openGlobalSearchResult(result: GlobalSearchResult) {
    openGlobalSearchResultInEditor(
      {
        clearEntryEditorDrafts,
        setEditingEntryName,
        setEntryEditorContext,
        setIsEntryEditorOpen,
        setIsGlobalSearchDialogOpen,
        setName,
        setShouldRestoreGlobalSearchAfterEditorClose,
        setValue,
      },
      result,
    )
  }

  function toggleAllFilteredEntries() {
    setSelectedEntryNames((current) => {
      const currentSelection = new Set(current)

      if (allFilteredEntriesSelected) {
        filteredEntries.forEach((entry) => {
          currentSelection.delete(entry.name)
        })
      } else {
        filteredEntries.forEach((entry) => {
          currentSelection.add(entry.name)
        })
      }

      return Array.from(currentSelection)
    })
  }

  async function handleCreateEnvironment() {
    setRepositoryError(null)
    setEnvironmentNameError(null)

    if (!selectedRepository) {
      setRepositoryError(
        variablesMessages.validation.selectRepositoryBeforeCreateEnvironment,
      )
      return
    }

    if (!environmentName.trim()) {
      setEnvironmentNameError(
        variablesMessages.validation.environmentNameRequired,
      )
      return
    }

    setIsCreatingEnvironment(true)

    try {
      const environment = await createEnvironmentForRepository({
        environmentName: environmentName.trim(),
        repository: selectedRepository,
      })

      const nextEnvironments = upsertEntryList(environments, environment)
      setEnvironments(nextEnvironments)
      setEnvironmentsRepository(selectedRepository)
      resetGlobalSearchData()
      clearEnvironmentEditing()
      closeEnvironmentCreateImmediately()
      await updateVariablesSearch(
        {
          environment: environment.name,
        },
        {
          replace: true,
        },
      )

      if (activeScope === 'environment-variables') {
        await loadEnvironmentVariablesForSelection(
          selectedRepository,
          environment.name,
        )
      } else {
        await loadEnvironmentSecretsForSelection(
          selectedRepository,
          environment.name,
        )
      }

      toast.success(variablesMessages.feedback.environmentCreated, {
        description: formatMessage(
          variablesMessages.feedback.environmentCreatedDescription,
          {
            name: environment.name,
            repository: selectedRepository,
          },
        ),
      })
    } catch (error) {
      toast.error(variablesMessages.errors.createEnvironmentFailed, {
        description:
          error instanceof Error
            ? error.message
            : variablesMessages.errors.createEnvironmentFailed,
      })
    } finally {
      setIsCreatingEnvironment(false)
    }
  }

  const isWaitingForCurrentEntries =
    Boolean(selectedRepository) &&
    (!isEnvironmentScope(activeScope)
      ? !hasLoadedCurrentEntries
      : environmentsRepository !== selectedRepository ||
        (!selectedEnvironment && isRefreshingEnvironments) ||
        (Boolean(selectedEnvironment) && !hasLoadedCurrentEntries))
  const isPageRefreshing =
    isRefreshingRepositories || isRefreshingEnvironments || isRefreshingEntries
  const isListLoading = isPageRefreshing || isWaitingForCurrentEntries
  const isListActionDisabled = isPageRefreshing
  const isEnvironmentActionDisabled = isRefreshingEnvironments
  const isTargetRefreshing =
    isRefreshingRepositories || isRefreshingEnvironments
  const valueColumnLabel = scopeConfig.valueColumnLabel
  const canMutateCurrentScope =
    Boolean(selectedRepository) &&
    (!isEnvironmentScope(activeScope) || Boolean(selectedEnvironment))
  const environmentNameInputId = 'environment-name-input'
  const environmentNameErrorId = 'environment-name-error'
  const deleteConfirmationInputId = 'delete-confirmation-input'
  const globalSearchInputId = 'global-entry-search-input'
  const entryNameInputId = 'entry-name-input'
  const entryNameErrorId = 'entry-name-error'
  const entryValueInputId = 'entry-value-input'
  const entryValueErrorId = 'entry-value-error'
  const bulkInputId = 'bulk-entry-input'
  const bulkInputErrorId = 'bulk-entry-error'
  const bulkInputErrorListId = 'bulk-entry-error-list'
  const searchInputId = 'entry-search-input'
  const {
    bulkApplyLabel,
    canMutateEntryEditorScope,
    duplicateSummary,
    entryEditorDescription,
    entryEditorNeedsEnvironmentSelection,
    entryEditorTitle,
    entryNameLabel,
    entryValueLabel,
    handleApplyBulkEntries,
    handleBulkInputChange,
    handleNameChange,
    handleSaveEntry,
    handleValueChange,
    isBulkEditorActive,
    isSingleEntryEditor,
    parsedBulk,
    parsedBulkErrors,
    previewSummary,
    saveActionLabel,
  } = useVariablesEntryEditorController({
    activeTab,
    bulkInput,
    currentEntries,
    editingEntryName,
    entryEditorEnvironment,
    entryEditorRepository,
    entryEditorScope,
    hasLoadedCurrentEntries,
    locale,
    name,
    refreshCurrentEntries,
    resetGlobalSearchData,
    store: {
      closeEntryEditorImmediately,
      resetRepositoryScopedData,
      setBulkInput,
      setBulkInputError,
      setEnvironmentSecrets,
      setEnvironmentSecretsKey,
      setEnvironmentSelectionError,
      setEnvironmentVariables,
      setEnvironmentVariablesKey,
      setIsBulkSaving,
      setIsSaving,
      setName,
      setNameError,
      setRepositoryError,
      setRepositorySecrets,
      setRepositorySecretsRepository,
      setRepositoryVariables,
      setRepositoryVariablesRepository,
      setValue,
      setValueError,
    },
    value,
    variablesMessages,
  })
  const singleEntryForm = (
    <VariablesSingleEntryForm
      editingEntryName={editingEntryName}
      entryEditorScope={entryEditorScope}
      entryNameErrorId={entryNameErrorId}
      entryNameInputId={entryNameInputId}
      entryNameLabel={entryNameLabel}
      entryValueErrorId={entryValueErrorId}
      entryValueInputId={entryValueInputId}
      entryValueLabel={entryValueLabel}
      isSaving={isSaving}
      name={name}
      nameError={nameError}
      onNameChange={handleNameChange}
      onSubmit={handleSaveEntry}
      onValueChange={handleValueChange}
      value={value}
      valueError={valueError}
      valuePlaceholder={entryEditorScopeConfig.valuePlaceholder}
      variablesMessages={variablesMessages}
    />
  )
  const bulkEntryPanel = (
    <VariablesBulkEntryPanel
      bulkInput={bulkInput}
      bulkInputError={bulkInputError}
      bulkInputErrorId={bulkInputErrorId}
      bulkInputErrorListId={bulkInputErrorListId}
      bulkInputId={bulkInputId}
      duplicateSummary={duplicateSummary}
      isBulkSaving={isBulkSaving}
      onBulkInputChange={handleBulkInputChange}
      parsedBulkEntries={parsedBulk.entries}
      parsedBulkErrors={parsedBulkErrors}
      previewSummary={previewSummary}
      valuePlaceholder={entryEditorScopeConfig.bulkPlaceholder}
      variablesMessages={variablesMessages}
    />
  )
  const {
    deleteDialog,
    requestDeleteEntries,
    requestDeleteEnvironment,
    requestDeleteSelectedEntries,
  } = useVariablesDeleteController({
    activeScope,
    deleteConfirmationInputId,
    deleteConfirmationValue,
    editingEntryName,
    environments,
    hasSelectedEntries,
    isDeletingEntries,
    isDeletingEnvironment,
    pendingDelete,
    selectedEntryNames,
    selectedEnvironment,
    selectedRepository,
    orchestration: {
      clearEnvironmentEditing,
      clearTableEditing,
      loadEnvironmentSecretsForSelection,
      loadEnvironmentVariablesForSelection,
      resetGlobalSearchData,
      updateVariablesSearch,
    },
    store: {
      closeEntryEditorImmediately,
      closeEnvironmentCreateImmediately,
      setDeleteConfirmationValue,
      setEnvironmentSecrets,
      setEnvironmentSecretsKey,
      setEnvironmentSelectionError,
      setEnvironmentVariables,
      setEnvironmentVariablesKey,
      setEnvironments,
      setIsDeletingEntries,
      setIsDeletingEnvironment,
      setPendingDelete,
      setRepositorySecrets,
      setRepositoryVariables,
      setSelectedEntryNames,
    },
    variablesMessages,
  })
  const {
    entriesPanelProps,
    entryEditorDialogProps,
    environmentCreateDialogProps,
    globalSearchDialogProps,
    targetPanelProps,
  } = useVariablesPageViewModels({
    activeScope,
    allFilteredEntriesSelected,
    bulkApplyLabel,
    bulkEntryPanel,
    canMutateCurrentScope,
    canMutateEntryEditorScope,
    currentEntries,
    entriesListState: {
      entrySortDirection,
      entrySortField,
      filteredEntries,
      hasLoadedCurrentEntries,
      isListActionDisabled,
      isListLoading,
      isTableEditing,
      listEmptyDescription,
      listEmptyTitle,
      noMatchesTitle,
      sortedFilteredEntries,
    },
    entriesPanelActions: {
      onClearSearch: () => {
        void updateVariablesSearch(
          {
            query: undefined,
          },
          {
            replace: true,
          },
        )
      },
      onDeleteSelected: requestDeleteSelectedEntries,
      onRequestDeleteEntry: (entryName: string) => {
        requestDeleteEntries([entryName])
      },
      onSearchChange: (value: string) => {
        void updateVariablesSearch(
          {
            query: value || undefined,
          },
          {
            replace: true,
          },
        )
      },
      onSortChange: handleEntrySortChange,
      onStartCreateEntry: startCreateEntry,
      onStartEditEntry: startEditingEntry,
      onToggleEntryEditing: (value: boolean) => setIsTableEditing(value),
      onToggleEntrySelection: toggleEntrySelection,
      onToggleFilteredSelection: toggleAllFilteredEntries,
    },
    entryEditorActions: {
      onApplyBulkEntries: () => {
        void handleApplyBulkEntries()
      },
      onCancel: requestCloseEntryEditor,
      onOpenChange: (open: boolean, details: { reason: string }) => {
        if (!open && details.reason === 'close-press') {
          requestCloseEntryEditor()
        }
      },
      onTabChange: (nextTab: 'single' | 'bulk') => {
        void updateVariablesSearch(
          {
            tab: nextTab,
          },
          {
            replace: true,
          },
        )
      },
    },
    entryEditorDescription,
    entryEditorNeedsEnvironmentSelection,
    entryEditorRepository,
    entryEditorScope,
    entryEditorState: {
      activeTab,
      isBulkEditorActive,
      isBulkSaving,
      isSaving,
      isSingleEntryEditor,
      open: isEntryEditorOpen,
      parsedBulkEntryCount: parsedBulk.entries.length,
      parsedBulkErrorCount: parsedBulkErrors.length,
      saveActionLabel,
    },
    entryEditorTitle,
    environmentCreateActions: {
      onClose: requestCloseEnvironmentCreate,
      onEnvironmentNameChange: (value: string) => {
        if (environmentNameError) {
          setEnvironmentNameError(null)
        }

        setEnvironmentName(value)
      },
      onOpenChange: (open: boolean, details: { reason: string }) => {
        if (!open && details.reason === 'close-press') {
          requestCloseEnvironmentCreate()
        }
      },
      onSubmit: () => {
        void handleCreateEnvironment()
      },
    },
    environmentCreateState: {
      environmentName,
      environmentNameError,
      environmentNameErrorId,
      environmentNameInputId,
      isCreatingEnvironment,
      isEnvironmentCreateOpen,
      selectedRepository,
    },
    environmentOptions,
    environmentSelectionError,
    environments,
    environmentsRepository,
    filteredGlobalSearchResults,
    globalSearchActions: {
      onClearSearch: () => setGlobalSearchQuery(''),
      onGlobalSearchQueryChange: setGlobalSearchQuery,
      onOpenChange: setIsGlobalSearchDialogOpen,
      onOpenResult: (result: GlobalSearchResult) => {
        void openGlobalSearchResult(result)
      },
      onRetry: () => {
        resetGlobalSearchData()
        void loadGlobalSearchForRepository(selectedRepository)
      },
    },
    globalSearchState: {
      filteredResults: filteredGlobalSearchResults,
      globalSearchError,
      globalSearchInputId,
      globalSearchQuery,
      isGlobalSearchDialogOpen,
      isGlobalSearchLoading,
      selectedRepository,
      trimmedGlobalSearchQuery,
    },
    hasPartiallySelectedEntries,
    hasSelectedEntries,
    locale,
    repositoryError,
    repositoryOptions,
    repositories,
    scopeConfig,
    searchInputId,
    searchQuery,
    selectedEntryNameSet,
    selectedEnvironment,
    selectedRepository,
    singleEntryForm,
    targetPanelActions: {
      onDeleteEnvironment: requestDeleteEnvironment,
      onDoneEnvironment: clearEnvironmentEditing,
      onEnvironmentChange: (nextEnvironment: string) => {
        void handleEnvironmentChange(nextEnvironment)
      },
      onOpenEnvironmentCreate: openEnvironmentCreate,
      onRefresh: () => {
        void refreshPageData()
      },
      onRepositoryChange: (nextRepository: string) => {
        void handleRepositoryChange(nextRepository)
      },
      onStartEnvironmentEditing: () => setIsEnvironmentEditing(true),
    },
    targetStatus: {
      isDeletingEnvironment,
      isEnvironmentActionDisabled,
      isEnvironmentEditing,
      isRefreshingEnvironments,
      isRefreshingRepositories,
      isTargetRefreshing,
    },
    valueColumnLabel,
    variablesMessages,
  })

  useEffect(() => {
    if (
      !isEntryEditorOpen ||
      !entryEditorRepository ||
      entryEditorNeedsEnvironmentSelection
    ) {
      return
    }

    const targetInputId = isBulkEditorActive
      ? bulkInputId
      : isSingleEntryEditor
        ? entryValueInputId
        : entryNameInputId

    const frameId = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetInputId)

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        target.focus()
        target.select()
      }
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    bulkInputId,
    entryEditorNeedsEnvironmentSelection,
    entryEditorRepository,
    entryNameInputId,
    entryValueInputId,
    isBulkEditorActive,
    isEntryEditorOpen,
    isSingleEntryEditor,
  ])

  useEffect(() => {
    if (!isGlobalSearchDialogOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const target = document.getElementById(globalSearchInputId)

      if (target instanceof HTMLInputElement) {
        target.focus()
        target.select()
      }
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [globalSearchInputId, isGlobalSearchDialogOpen])

  return (
    <main className="page-wrap flex min-h-full flex-col gap-6 px-4 py-6 sm:py-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="sr-only">{scopeConfig.title}</h1>
            {currentTargetLabel ? (
              <Badge
                variant="outline"
                className="h-auto max-w-full justify-start self-start px-2.5 py-1 whitespace-normal break-all text-muted-foreground"
              >
                {currentTargetLabel}
              </Badge>
            ) : null}
          </div>

          {status.authenticated ? (
            <Button
              type="button"
              variant="outline"
              aria-haspopup="dialog"
              aria-expanded={isGlobalSearchDialogOpen}
              aria-label={variablesMessages.globalSearch.title}
              className="self-start lg:shrink-0"
              title={variablesMessages.globalSearch.title}
              onClick={() => setIsGlobalSearchDialogOpen(true)}
            >
              <SearchIcon
                data-icon="inline-start"
                className="text-muted-foreground"
              />
              <span className="text-foreground">
                {variablesMessages.globalSearch.title}
              </span>
            </Button>
          ) : null}
        </div>

        <Tabs
          className="w-full"
          value={activeScope}
          onValueChange={(nextScope) =>
            void handleScopeChange(nextScope as SettingsScope)
          }
        >
          <TabsList className="grid! h-auto! w-full! grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-1.5 sm:inline-flex! sm:w-fit! sm:gap-1 sm:p-1">
            {scopeTabDisplayOrder.map((scope) => {
              const messageKey = scopeMessageKeys[scope]
              const config = variablesMessages.scopes[messageKey]

              return (
                <TabsTrigger
                  key={scope}
                  value={scope}
                  className="h-11 w-full min-w-0 rounded-md border border-transparent px-3 text-sm font-medium text-muted-foreground transition-[background-color,border-color,color,box-shadow] data-active:border-border/70 data-active:bg-background data-active:text-foreground data-active:shadow-sm sm:h-10 sm:w-auto sm:min-w-29 sm:flex-none sm:px-4"
                >
                  {config.tabLabel}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </section>

      {!status.authenticated ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{variablesMessages.unauthenticatedTitle}</EmptyTitle>
            <EmptyDescription>
              {variablesMessages.unauthenticatedDescription}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/connect"
              className={`${buttonVariants({ size: 'lg' })} no-underline`}
            >
              {variablesMessages.openAccountButton}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <VariablesTargetPanel {...targetPanelProps} />

            <VariablesEntriesPanel {...entriesPanelProps} />
          </div>

          <VariablesGlobalSearchDialog {...globalSearchDialogProps} />

          <VariablesEntryEditorDialog {...entryEditorDialogProps} />

          <VariablesEnvironmentCreateDialog {...environmentCreateDialogProps} />
        </>
      )}

      <VariablesDeleteConfirmDialog
        actions={deleteDialog.actions}
        state={deleteDialog.state}
        variablesMessages={variablesMessages}
      />
    </main>
  )
}

function VariablesSearchTriggerSkeleton() {
  return <Skeleton className="h-8 w-40 rounded-lg lg:shrink-0" />
}

function VariablesTargetFieldsSkeleton({
  showsEnvironmentTarget,
}: {
  showsEnvironmentTarget: boolean
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>

      {showsEnvironmentTarget ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>

            <div className="flex items-end lg:justify-end">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function VariablesCurrentTargetSkeleton() {
  return <Skeleton className="h-7 w-44 max-w-full rounded-full" />
}

function VariablesRoutePending() {
  const messages = getPendingVariablesMessages()
  const search = Route.useSearch()
  const activeScope = search.scope ?? 'repository-variables'
  const showsEnvironmentTarget = isEnvironmentScope(activeScope)

  return (
    <main className="page-wrap flex min-h-full flex-col gap-6 px-4 py-6 sm:py-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <VariablesCurrentTargetSkeleton />
          </div>

          <VariablesSearchTriggerSkeleton />
        </div>

        <div className="grid! h-auto! w-full! grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-1.5 sm:inline-flex! sm:w-fit! sm:gap-1 sm:p-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-11 w-full rounded-md sm:h-10 sm:w-29"
            />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{messages.pending.targetTitle}</CardTitle>
            <CardDescription>
              {messages.pending.targetDescription}
            </CardDescription>
            <CardAction>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <VariablesTargetFieldsSkeleton
              showsEnvironmentTarget={showsEnvironmentTarget}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{messages.pending.listTitle}</CardTitle>
            <CardDescription>
              {messages.pending.listDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-1">
                <Skeleton className="h-8 w-full rounded-lg sm:flex-1" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            </div>
            <LoadingTable />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export function LoadingSearchResults() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  )
}

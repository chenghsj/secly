import { createFileRoute, useRouterState } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { useAppPreferences } from '../components/app/app-settings-provider'
import {
  defaultVariablesEntrySort,
  validateVariablesSearch,
} from '#/lib/variables-route-search'
import type {
  VariablesEntrySortDirection,
  VariablesEntrySortField,
  VariablesSearch,
} from '#/lib/variables-route-search'
import {
  getPendingVariablesMessages,
  getScopeConfig,
  getVariablesAuthIdentity,
  getVariablesPageDataSnapshotKey,
  isEnvironmentScope,
} from '#/features/variables/models/variables-helpers'
import {
  VariablesBulkEntryPanel,
  VariablesRoutePendingScreen,
  VariablesRouteScreenContainer,
  VariablesSingleEntryForm,
  createVariablesDeleteDialogProps,
  createVariablesEntriesPanelProps,
  createVariablesEntryEditorDialogProps,
  createVariablesEnvironmentCreateDialogProps,
  createVariablesFocusManagementProps,
  createVariablesGlobalSearchDialogProps,
  createVariablesTargetPanelProps,
} from '#/features/variables/ui'
import { useVariablesDeleteController } from '#/features/variables/controllers/use-variables-delete-controller'
import { useVariablesEntryEditorController } from '#/features/variables/controllers/use-variables-entry-editor-controller'
import { useVariablesOrchestration } from '#/features/variables/controllers/use-variables-orchestration'
import { useVariablesRouteNavigation } from '#/features/variables/controllers/use-variables-route-navigation'
import { useVariablesRouteActions } from '../features/variables/controllers/use-variables-route-actions'
import {
  createSelectionState,
  filterGlobalResultsForRepository,
  filterSettingsEntries,
  getCurrentEntriesForScope,
  hasLoadedEntriesForScope,
  resolveSelectedEnvironment,
  resolveSelectedRepository,
  sortFilteredEntries,
} from '#/features/variables/models/variables-page-derivations'
import { useVariablesRoutePageState } from '#/features/variables/models/use-variables-route-page-state'
import { loadVariablesRouteData } from '#/features/variables/state/variables-route-loader'
import {
  readVariablesPageDataSnapshot,
  writeVariablesPageDataSnapshot,
} from '#/features/variables/state/variables-session-cache'
import {
  VariablesStoreProvider,
  createVariablesStoreInitialState,
} from '#/features/variables/state/variables-store'
import { useVariablesRouteStore } from '#/features/variables/state/use-variables-route-store.ts'
import type { VariablesLoaderData } from '#/features/variables/domain/variables-types'
export const Route = createFileRoute('/variables')({
  validateSearch: validateVariablesSearch,
  staleTime: Infinity,
  gcTime: Infinity,
  // Keep the route loader as bootstrap/auth refresh only. In-page
  // orchestration owns search-driven loading so scope/repository switches use
  // local loading states instead of remounting into the route pending UI.
  shouldReload: false,
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
        initialDataSnapshot: readVariablesPageDataSnapshot({
          allowSnapshotRestore,
          dataSnapshotKey: getVariablesPageDataSnapshotKey(
            authIdentity,
            search,
          ),
        }),
        loaderData,
      }),
    [allowSnapshotRestore, authIdentity, loaderData, search],
  )

  return (
    <VariablesStoreProvider initialState={initialState}>
      <VariablesPageContent
        allowSnapshotRestore={allowSnapshotRestore}
        authIdentity={authIdentity}
        dataSnapshotKey={getVariablesPageDataSnapshotKey(authIdentity, search)}
        loaderData={loaderData}
        search={search}
      />
    </VariablesStoreProvider>
  )
}

function VariablesPageContent({
  allowSnapshotRestore,
  authIdentity,
  dataSnapshotKey,
  loaderData,
  search,
}: {
  allowSnapshotRestore: boolean
  authIdentity: string
  dataSnapshotKey: string
  loaderData: VariablesLoaderData
  search: VariablesSearch
}) {
  const navigate = Route.useNavigate()
  const { locale, messages } = useAppPreferences()
  const { status } = loaderData
  const {
    editorActions,
    editorState,
    resetRepositoryScopedData,
    resourceActions,
    resourceState,
    uiActions,
    uiState,
  } = useVariablesRouteStore()
  const {
    environmentSecrets,
    environmentSecretsKey,
    environmentVariables,
    environmentVariablesKey,
    environments,
    environmentsRepository,
    repositories,
    repositorySecrets,
    repositorySecretsRepository,
    repositoryVariables,
    repositoryVariablesRepository,
  } = resourceState
  const {
    bulkInput,
    bulkInputError,
    editingEntryName,
    entryEditorContext,
    environmentName,
    environmentNameError,
    isBulkSaving,
    isCreatingEnvironment,
    isEntryEditorOpen,
    isEnvironmentCreateOpen,
    isSaving,
    name,
    nameError,
    shouldRestoreGlobalSearchAfterEditorClose,
    value,
    valueError,
  } = editorState
  const {
    deleteConfirmationValue,
    environmentSelectionError,
    globalSearchError,
    globalSearchQuery,
    globalSearchRepository,
    globalSearchResults,
    isDeletingEntries,
    isDeletingEnvironment,
    isEnvironmentEditing,
    isGlobalSearchDialogOpen,
    isGlobalSearchLoading,
    isRefreshingEntries,
    isRefreshingEnvironments,
    isRefreshingRepositories,
    isTableEditing,
    pendingDelete,
    repositoryError,
    selectedEntryNames,
  } = uiState
  const {
    clearEntryEditorDrafts,
    closeEntryEditorImmediately,
    closeEnvironmentCreateImmediately,
    setBulkInput,
    setBulkInputError,
    setEditingEntryName,
    setEnvironmentName,
    setEnvironmentNameError,
    setEntryEditorContext,
    setIsBulkSaving,
    setIsCreatingEnvironment,
    setIsEntryEditorOpen,
    setIsEnvironmentCreateOpen,
    setIsSaving,
    setName,
    setNameError,
    setShouldRestoreGlobalSearchAfterEditorClose,
    setValue,
    setValueError,
  } = editorActions
  const {
    clearEnvironmentEditing,
    clearGlobalSearchData,
    clearTableEditing,
    setDeleteConfirmationValue,
    setEnvironmentSelectionError,
    setGlobalSearchError,
    setGlobalSearchQuery,
    setGlobalSearchRepository,
    setGlobalSearchResults,
    setIsDeletingEntries,
    setIsDeletingEnvironment,
    setIsEnvironmentEditing,
    setIsGlobalSearchDialogOpen,
    setIsGlobalSearchLoading,
    setIsRefreshingEntries,
    setIsRefreshingEnvironments,
    setIsRefreshingRepositories,
    setIsTableEditing,
    setPendingDelete,
    setRepositoryError,
    setSelectedEntryNames,
    toggleEntrySelection,
  } = uiActions
  const {
    setEnvironmentSecrets,
    setEnvironmentSecretsKey,
    setEnvironmentVariables,
    setEnvironmentVariablesKey,
    setEnvironments,
    setEnvironmentsRepository,
    setRepositories,
    setRepositorySecrets,
    setRepositorySecretsRepository,
    setRepositoryVariables,
    setRepositoryVariablesRepository,
  } = resourceActions
  const variablesMessages = messages.variables
  const activeScope = search.scope ?? 'repository-variables'
  const selectedRepository = useMemo(
    () =>
      resolveSelectedRepository({
        initialRepository: loaderData.initialRepository,
        repositories,
        searchRepository: search.repository,
      }),
    [loaderData.initialRepository, repositories, search.repository],
  )
  const selectedEnvironment = useMemo(
    () =>
      resolveSelectedEnvironment({
        activeScope,
        environments,
        environmentsRepository,
        searchEnvironment: search.environment,
        selectedRepository,
      }),
    [
      activeScope,
      environments,
      environmentsRepository,
      search.environment,
      selectedRepository,
    ],
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
  const currentEntries = useMemo(
    () =>
      getCurrentEntriesForScope({
        activeScope,
        environmentSecrets,
        environmentVariables,
        repositorySecrets,
        repositoryVariables,
      }),
    [
      activeScope,
      environmentSecrets,
      environmentVariables,
      repositorySecrets,
      repositoryVariables,
    ],
  )
  const filteredEntries = useMemo(() => {
    return filterSettingsEntries({
      currentEntries,
      query: searchQuery,
    })
  }, [currentEntries, searchQuery])
  const filteredGlobalSearchResults = useMemo(() => {
    return filterGlobalResultsForRepository({
      globalSearchRepository,
      query: trimmedGlobalSearchQuery,
      results: globalSearchResults,
      selectedRepository,
    })
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
      sortFilteredEntries({
        activeScope,
        collator: entrySortCollator,
        direction: entrySortDirection,
        entries: filteredEntries,
        field: entrySortField,
      }),
    [
      activeScope,
      entrySortCollator,
      entrySortDirection,
      entrySortField,
      filteredEntries,
    ],
  )
  const {
    allFilteredEntriesSelected,
    hasPartiallySelectedEntries,
    hasSelectedEntries,
    selectedEntryNameSet,
  } = useMemo(
    () =>
      createSelectionState({
        filteredEntries,
        selectedEntryNames,
      }),
    [filteredEntries, selectedEntryNames],
  )

  const {
    clearEntrySearch,
    setEntryEditorTab,
    setEntrySearchQuery,
    setEntrySort,
    updateVariablesSearch,
  } = useVariablesRouteNavigation({
    entrySortDirection,
    entrySortField,
    navigate,
  })

  const orchestrationContext = {
    activeScope,
    allowSnapshotRestore,
    authIdentity,
    searchEnvironment: search.environment,
    selectedEnvironment,
    selectedRepository,
    statusAuthenticated: status.authenticated,
    trimmedGlobalSearchQuery,
    variablesMessages,
  }
  const orchestrationNavigation = {
    navigate,
    updateVariablesSearch,
  }
  const orchestrationStore = {
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
  }

  const {
    handleEnvironmentChange,
    handleRepositoryChange,
    handleScopePrefetch,
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
    context: orchestrationContext,
    navigation: orchestrationNavigation,
    store: orchestrationStore,
  })

  const hasLoadedCurrentEntries = hasLoadedEntriesForScope({
    activeScope,
    environmentSecretsKey,
    environmentVariablesKey,
    repositorySecretsRepository,
    repositoryVariablesRepository,
    selectedEnvironment,
    selectedRepository,
  })
  useEffect(() => {
    writeVariablesPageDataSnapshot({
      dataSnapshotKey,
      initialRepository: selectedRepository || loaderData.initialRepository,
      loaderData: {
        environmentSecrets,
        environmentSecretsKey,
        environmentVariables,
        environmentVariablesKey,
        environments,
        environmentsRepository,
        repositories,
        repositorySecrets,
        repositorySecretsRepository,
        repositoryVariables,
        repositoryVariablesRepository,
      },
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

  const routeActionOrchestration = {
    loadEnvironmentSecretsForSelection,
    loadEnvironmentVariablesForSelection,
    resetGlobalSearchData,
    updateVariablesSearch,
  }
  const routeActionSelection = {
    activeScope,
    allFilteredEntriesSelected,
    editingEntryName,
    environmentName,
    filteredEntries,
    isGlobalSearchDialogOpen,
    selectedEnvironment,
    selectedRepository,
  }
  const routeActionStore = {
    clearEntryEditorDrafts,
    clearEnvironmentEditing,
    closeEnvironmentCreateImmediately,
    setEditingEntryName,
    setEntryEditorContext,
    setEnvironmentName,
    setEnvironmentNameError,
    setEnvironmentSelectionError,
    setEnvironments,
    setEnvironmentsRepository,
    setEnvironmentSecrets,
    setEnvironmentSecretsKey,
    setEnvironmentVariables,
    setEnvironmentVariablesKey,
    setGlobalSearchResults,
    setIsCreatingEnvironment,
    setIsEntryEditorOpen,
    setIsEnvironmentCreateOpen,
    setIsGlobalSearchDialogOpen,
    setName,
    setRepositoryError,
    setRepositorySecrets,
    setRepositorySecretsRepository,
    setRepositoryVariables,
    setRepositoryVariablesRepository,
    setSelectedEntryNames,
    setShouldRestoreGlobalSearchAfterEditorClose,
    setValue,
  }

  const {
    handleCreateEnvironment,
    openEnvironmentCreate,
    saveGlobalSearchResult,
    startCreateEntry,
    startEditingEntry,
    toggleAllFilteredEntries,
    toggleVariableLock,
  } = useVariablesRouteActions({
    orchestration: routeActionOrchestration,
    selection: routeActionSelection,
    store: routeActionStore,
    variablesMessages,
  })
  const {
    canMutateCurrentScope,
    ids: {
      bulkInputErrorId,
      bulkInputErrorListId,
      bulkInputId,
      deleteConfirmationInputId,
      entryNameErrorId,
      entryNameInputId,
      entryValueErrorId,
      entryValueInputId,
      environmentNameErrorId,
      environmentNameInputId,
      globalSearchInputId,
      searchInputId,
    },
    listEmptyDescription,
    listEmptyTitle,
    noMatchesTitle,
    status: {
      isEnvironmentActionDisabled,
      isListActionDisabled,
      isListLoading,
      isTargetRefreshing,
    },
  } = useVariablesRoutePageState({
    activeScope,
    environmentsRepository,
    hasLoadedCurrentEntries,
    isRefreshingEntries,
    isRefreshingEnvironments,
    isRefreshingRepositories,
    selectedEnvironment,
    selectedRepository,
    variablesMessages,
  })

  const valueColumnLabel = scopeConfig.valueColumnLabel

  const entryEditorControllerContext = {
    activeTab,
    currentEntries,
    editingEntryName,
    entryEditorEnvironment,
    entryEditorRepository,
    entryEditorScope,
    hasLoadedCurrentEntries,
    locale,
  }
  const entryEditorControllerDependencies = {
    refreshCurrentEntries,
    refreshPageData,
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
    variablesMessages,
  }
  const entryEditorControllerDraft = {
    bulkInput,
    name,
    value,
  }
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
    context: entryEditorControllerContext,
    dependencies: entryEditorControllerDependencies,
    draft: entryEditorControllerDraft,
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
    dependencies: {
      orchestration: {
        clearEnvironmentEditing,
        clearTableEditing,
        loadEnvironmentSecretsForSelection,
        loadEnvironmentVariablesForSelection,
        refreshCurrentEntries,
        refreshPageData,
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
        setRepositorySecretsRepository,
        setRepositoryVariables,
        setRepositoryVariablesRepository,
        setSelectedEntryNames,
      },
      variablesMessages,
    },
    selection: {
      activeScope,
      editingEntryName,
      environments,
      hasSelectedEntries,
      selectedEntryNames,
      selectedEnvironment,
      selectedRepository,
    },
    state: {
      deleteConfirmationInputId,
      deleteConfirmationValue,
      isDeletingEntries,
      isDeletingEnvironment,
      pendingDelete,
    },
  })

  const deleteDialogProps = createVariablesDeleteDialogProps({
    deleteDialog,
    variablesMessages,
  })

  const entriesPanelProps = createVariablesEntriesPanelProps({
    activeScope,
    allFilteredEntriesSelected,
    canMutateCurrentScope,
    clearEntrySearch,
    currentEntries,
    entrySortDirection,
    entrySortField,
    environments,
    environmentsRepository,
    handleScopeChange,
    handleScopePrefetch,
    filteredEntries,
    hasLoadedCurrentEntries,
    hasPartiallySelectedEntries,
    hasSelectedEntries,
    inputId: searchInputId,
    isListActionDisabled,
    isListLoading,
    isTableEditing,
    listEmptyDescription,
    listEmptyTitle,
    locale,
    noMatchesTitle,
    query: searchQuery,
    requestDeleteEntries,
    requestDeleteSelectedEntries,
    scopeConfig,
    selectedEntryNameSet,
    selectedEnvironment,
    selectedRepository,
    setEntrySearchQuery,
    setEntrySort,
    setIsTableEditing,
    sortedFilteredEntries,
    startCreateEntry,
    startEditingEntry,
    toggleAllFilteredEntries,
    toggleEntrySelection,
    toggleVariableLock,
    valueColumnLabel,
    variablesMessages,
  })

  const entryEditorDialogProps = createVariablesEntryEditorDialogProps({
    activeTab,
    bulkApplyLabel,
    bulkEntryPanel,
    canMutateEntryEditorScope,
    entryEditorDescription,
    entryEditorNeedsEnvironmentSelection,
    entryEditorRepository,
    entryEditorScope,
    entryEditorTitle,
    handleApplyBulkEntries,
    isBulkEditorActive,
    isBulkSaving,
    isSaving,
    isSingleEntryEditor,
    open: isEntryEditorOpen,
    parsedBulkEntryCount: parsedBulk.entries.length,
    parsedBulkErrorCount: parsedBulkErrors.length,
    requestCloseEntryEditor,
    saveActionLabel,
    setEntryEditorTab,
    singleEntryForm,
    variablesMessages,
  })

  const environmentCreateDialogProps =
    createVariablesEnvironmentCreateDialogProps({
      environmentName,
      environmentNameError,
      environmentNameErrorId,
      environmentNameInputId,
      handleCreateEnvironment,
      isCreatingEnvironment,
      isEnvironmentCreateOpen,
      requestCloseEnvironmentCreate,
      selectedRepository,
      setEnvironmentName,
      setEnvironmentNameError,
      variablesMessages,
    })

  const focusManagementProps = createVariablesFocusManagementProps({
    bulkInputId,
    entryEditorNeedsEnvironmentSelection,
    entryEditorRepository,
    entryNameInputId,
    entryValueInputId,
    globalSearchInputId,
    isBulkEditorActive,
    isEntryEditorOpen,
    isGlobalSearchDialogOpen,
    isSingleEntryEditor,
  })

  const globalSearchDialogProps = createVariablesGlobalSearchDialogProps({
    filteredResults: filteredGlobalSearchResults,
    globalSearchError,
    globalSearchInputId,
    globalSearchQuery,
    isGlobalSearchDialogOpen,
    isGlobalSearchLoading,
    loadGlobalSearchForRepository,
    locale,
    resetGlobalSearchData,
    saveGlobalSearchResult,
    selectedRepository,
    setGlobalSearchQuery,
    setIsGlobalSearchDialogOpen,
    trimmedGlobalSearchQuery,
    variablesMessages,
  })

  const targetPanelProps = createVariablesTargetPanelProps({
    activeScope,
    clearEnvironmentEditing,
    environmentSelectionError,
    environments,
    handleEnvironmentChange,
    handleRepositoryChange,
    handleScopeChange,
    handleScopePrefetch,
    isDeletingEnvironment,
    isEnvironmentActionDisabled,
    isEnvironmentEditing,
    isRefreshingEnvironments,
    isRefreshingRepositories,
    isTargetRefreshing,
    openEnvironmentCreate,
    refreshPageData,
    repositories,
    repositoryError,
    requestDeleteEnvironment,
    selectedEnvironment,
    selectedRepository,
    setIsEnvironmentEditing,
    variablesMessages,
  })

  return (
    <VariablesRouteScreenContainer
      deleteDialog={deleteDialogProps}
      entriesPanel={entriesPanelProps}
      entryEditorDialog={entryEditorDialogProps}
      environmentCreateDialog={environmentCreateDialogProps}
      focusManagement={focusManagementProps}
      globalSearchDialog={globalSearchDialogProps}
      isAuthenticated={status.authenticated}
      isGlobalSearchDialogOpen={isGlobalSearchDialogOpen}
      onOpenGlobalSearch={() => setIsGlobalSearchDialogOpen(true)}
      scopeTitle={scopeConfig.title}
      targetPanel={targetPanelProps}
      variablesMessages={variablesMessages}
    />
  )
}

function VariablesRoutePending() {
  const messages = getPendingVariablesMessages()
  const search = Route.useSearch()
  const activeScope = search.scope ?? 'repository-variables'
  const showsEnvironmentTarget = isEnvironmentScope(activeScope)

  return (
    <VariablesRoutePendingScreen
      messages={messages}
      showsEnvironmentTarget={showsEnvironmentTarget}
    />
  )
}

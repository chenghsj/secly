import type { ReactNode } from 'react'
import type {
  SettingsScope,
  VariablesEntrySortDirection,
  VariablesEntrySortField,
} from '#/lib/variables-route-search'
import type { AppLocale } from '#/messages'
import type {
  SettingsEntry,
  VariablesMessages,
} from '#/features/variables/domain/variables-types'
import type { VariablesRouteScreenContainerProps } from './variables-route-screen-container'

export function createVariablesDeleteDialogProps({
  deleteDialog,
  variablesMessages,
}: {
  deleteDialog: {
    actions: VariablesRouteScreenContainerProps['deleteDialog']['actions']
    state: VariablesRouteScreenContainerProps['deleteDialog']['state']
  }
  variablesMessages: VariablesMessages
}): VariablesRouteScreenContainerProps['deleteDialog'] {
  return {
    actions: deleteDialog.actions,
    state: deleteDialog.state,
    variablesMessages,
  }
}

export function createVariablesEntriesPanelProps({
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
  inputId,
  isListActionDisabled,
  isListLoading,
  isTableEditing,
  listEmptyDescription,
  listEmptyTitle,
  locale,
  noMatchesTitle,
  query,
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
}: {
  activeScope: SettingsScope
  allFilteredEntriesSelected: boolean
  canMutateCurrentScope: boolean
  clearEntrySearch: () => Promise<void>
  currentEntries: VariablesRouteScreenContainerProps['entriesPanel']['currentEntries']
  entrySortDirection: VariablesEntrySortDirection
  entrySortField: VariablesEntrySortField
  environments: VariablesRouteScreenContainerProps['entriesPanel']['environments']
  environmentsRepository: string
  handleScopeChange: (nextScope: SettingsScope) => Promise<void>
  handleScopePrefetch: (nextScope: SettingsScope) => Promise<void>
  filteredEntries: VariablesRouteScreenContainerProps['entriesPanel']['filteredEntries']
  hasLoadedCurrentEntries: boolean
  hasPartiallySelectedEntries: boolean
  hasSelectedEntries: boolean
  inputId: string
  isListActionDisabled: boolean
  isListLoading: boolean
  isTableEditing: boolean
  listEmptyDescription: string
  listEmptyTitle: string
  locale: AppLocale
  noMatchesTitle: string
  query: string
  requestDeleteEntries: (entryNames: string[]) => void
  requestDeleteSelectedEntries: () => void
  scopeConfig: VariablesRouteScreenContainerProps['entriesPanel']['scopeConfig']
  selectedEntryNameSet: Set<string>
  selectedEnvironment: string
  selectedRepository: string
  setEntrySearchQuery: (value: string) => Promise<void>
  setEntrySort: (field: VariablesEntrySortField) => Promise<void>
  setIsTableEditing: (value: boolean) => void
  sortedFilteredEntries: VariablesRouteScreenContainerProps['entriesPanel']['sortedFilteredEntries']
  startCreateEntry: () => void
  startEditingEntry: (entry: SettingsEntry) => void
  toggleAllFilteredEntries: () => void
  toggleEntrySelection: (entryName: string) => void
  toggleVariableLock: (entryName: string, isLocked: boolean) => void
  valueColumnLabel: string
  variablesMessages: VariablesMessages
}): VariablesRouteScreenContainerProps['entriesPanel'] {
  return {
    actions: {
      onClearSearch: () => {
        void clearEntrySearch()
      },
      onDeleteSelected: requestDeleteSelectedEntries,
      onRequestDeleteEntry: (entryName: string) => {
        requestDeleteEntries([entryName])
      },
      onSearchChange: (value: string) => {
        void setEntrySearchQuery(value)
      },
      onScopeChange: (nextScope: SettingsScope) => {
        if (nextScope === activeScope) {
          return
        }

        void handleScopeChange(nextScope).catch(() => undefined)
      },
      onScopePrefetch: (nextScope: SettingsScope) => {
        void handleScopePrefetch(nextScope)
      },
      onSortChange: (field: VariablesEntrySortField) => {
        void setEntrySort(field)
      },
      onStartCreateEntry: startCreateEntry,
      onStartEditEntry: startEditingEntry,
      onToggleEntryEditing: (value: boolean) => setIsTableEditing(value),
      onToggleEntrySelection: toggleEntrySelection,
      onToggleFilteredSelection: toggleAllFilteredEntries,
      onToggleVariableLock: toggleVariableLock,
    },
    activeScope,
    allFilteredEntriesSelected,
    canMutateCurrentScope,
    currentEntries,
    entrySortDirection,
    entrySortField,
    environments,
    environmentsRepository,
    filteredEntries,
    hasLoadedCurrentEntries,
    hasPartiallySelectedEntries,
    hasSelectedEntries,
    inputId,
    isListActionDisabled,
    isListLoading,
    isTableEditing,
    listEmptyDescription,
    listEmptyTitle,
    locale,
    noMatchesTitle,
    query,
    scopeConfig,
    selectedEntryNameSet,
    selectedEnvironment,
    selectedRepository,
    sortedFilteredEntries,
    valueColumnLabel,
    variablesMessages,
  }
}

export function createVariablesEntryEditorDialogProps({
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
  open,
  parsedBulkEntryCount,
  parsedBulkErrorCount,
  requestCloseEntryEditor,
  saveActionLabel,
  setEntryEditorTab,
  singleEntryForm,
  variablesMessages,
}: {
  activeTab: VariablesRouteScreenContainerProps['entryEditorDialog']['activeTab']
  bulkApplyLabel: string
  bulkEntryPanel: ReactNode
  canMutateEntryEditorScope: boolean
  entryEditorDescription: string
  entryEditorNeedsEnvironmentSelection: boolean
  entryEditorRepository: string
  entryEditorScope: SettingsScope
  entryEditorTitle: string
  handleApplyBulkEntries: () => Promise<void>
  isBulkEditorActive: boolean
  isBulkSaving: boolean
  isSaving: boolean
  isSingleEntryEditor: boolean
  open: boolean
  parsedBulkEntryCount: number
  parsedBulkErrorCount: number
  requestCloseEntryEditor: () => void
  saveActionLabel: string
  setEntryEditorTab: (nextTab: 'single' | 'bulk') => Promise<void>
  singleEntryForm: ReactNode
  variablesMessages: VariablesMessages
}): VariablesRouteScreenContainerProps['entryEditorDialog'] {
  return {
    actions: {
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
        void setEntryEditorTab(nextTab)
      },
    },
    activeTab,
    bulkApplyLabel,
    bulkEntryPanel,
    canMutateEntryEditorScope,
    entryEditorDescription,
    entryEditorNeedsEnvironmentSelection,
    entryEditorRepository,
    entryEditorScope,
    entryEditorTitle,
    isBulkEditorActive,
    isBulkSaving,
    isSaving,
    isSingleEntryEditor,
    open,
    parsedBulkEntryCount,
    parsedBulkErrorCount,
    saveActionLabel,
    singleEntryForm,
    variablesMessages,
  }
}

export function createVariablesEnvironmentCreateDialogProps({
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
}: {
  environmentName: string
  environmentNameError: string | null
  environmentNameErrorId: string
  environmentNameInputId: string
  handleCreateEnvironment: () => Promise<void>
  isCreatingEnvironment: boolean
  isEnvironmentCreateOpen: boolean
  requestCloseEnvironmentCreate: () => void
  selectedRepository: string
  setEnvironmentName: (value: string) => void
  setEnvironmentNameError: (value: string | null) => void
  variablesMessages: VariablesMessages
}): VariablesRouteScreenContainerProps['environmentCreateDialog'] {
  return {
    actions: {
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
    environmentName,
    environmentNameError,
    environmentNameErrorId,
    environmentNameInputId,
    isCreatingEnvironment,
    isEnvironmentCreateOpen,
    selectedRepository,
    variablesMessages,
  }
}

export function createVariablesFocusManagementProps({
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
}: VariablesRouteScreenContainerProps['focusManagement']): VariablesRouteScreenContainerProps['focusManagement'] {
  return {
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
  }
}

export function createVariablesGlobalSearchDialogProps({
  filteredResults,
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
}: {
  filteredResults: VariablesRouteScreenContainerProps['globalSearchDialog']['filteredResults']
  globalSearchError: string | null
  globalSearchInputId: string
  globalSearchQuery: string
  isGlobalSearchDialogOpen: boolean
  isGlobalSearchLoading: boolean
  loadGlobalSearchForRepository: (repository: string) => Promise<void>
  locale: AppLocale
  resetGlobalSearchData: () => void
  saveGlobalSearchResult: VariablesRouteScreenContainerProps['globalSearchDialog']['actions']['onSaveResult']
  selectedRepository: string
  setGlobalSearchQuery: (value: string) => void
  setIsGlobalSearchDialogOpen: (value: boolean) => void
  trimmedGlobalSearchQuery: string
  variablesMessages: VariablesMessages
}): VariablesRouteScreenContainerProps['globalSearchDialog'] {
  return {
    actions: {
      onClearSearch: () => setGlobalSearchQuery(''),
      onGlobalSearchQueryChange: setGlobalSearchQuery,
      onOpenChange: setIsGlobalSearchDialogOpen,
      onSaveResult: saveGlobalSearchResult,
      onRetry: () => {
        resetGlobalSearchData()
        void loadGlobalSearchForRepository(selectedRepository)
      },
    },
    filteredResults,
    globalSearchError,
    globalSearchInputId,
    globalSearchQuery,
    isGlobalSearchDialogOpen,
    isGlobalSearchLoading,
    locale,
    selectedRepository,
    trimmedGlobalSearchQuery,
    variablesMessages,
  }
}

export function createVariablesTargetPanelActions({
  activeScope,
  clearEnvironmentEditing,
  handleEnvironmentChange,
  handleRepositoryChange,
  handleScopeChange,
  handleScopePrefetch,
  openEnvironmentCreate,
  refreshPageData,
  requestDeleteEnvironment,
  selectedEnvironment,
  selectedRepository,
  setIsEnvironmentEditing,
}: {
  activeScope: SettingsScope
  clearEnvironmentEditing: () => void
  handleEnvironmentChange: (nextEnvironment: string) => Promise<void>
  handleRepositoryChange: (nextRepository: string) => Promise<void>
  handleScopeChange: (nextScope: SettingsScope) => Promise<void>
  handleScopePrefetch: (nextScope: SettingsScope) => Promise<void>
  openEnvironmentCreate: () => void
  refreshPageData: (options: { forceRefresh: boolean }) => Promise<void>
  requestDeleteEnvironment: () => void
  selectedEnvironment: string
  selectedRepository: string
  setIsEnvironmentEditing: (value: boolean) => void
}): VariablesRouteScreenContainerProps['targetPanel']['actions'] {
  return {
    onDeleteEnvironment: requestDeleteEnvironment,
    onDoneEnvironment: clearEnvironmentEditing,
    onEnvironmentChange: (nextEnvironment: string) => {
      if (nextEnvironment === selectedEnvironment) {
        return
      }

      void handleEnvironmentChange(nextEnvironment).catch(() => undefined)
    },
    onOpenEnvironmentCreate: openEnvironmentCreate,
    onRefresh: () => {
      void refreshPageData({ forceRefresh: true })
    },
    onRepositoryChange: (nextRepository: string) => {
      if (nextRepository === selectedRepository) {
        return
      }

      void handleRepositoryChange(nextRepository).catch(() => undefined)
    },
    onScopePrefetch: (nextScope: SettingsScope) => {
      void handleScopePrefetch(nextScope)
    },
    onScopeChange: (nextScope: SettingsScope) => {
      if (nextScope === activeScope) {
        return
      }

      void handleScopeChange(nextScope).catch(() => undefined)
    },
    onStartEnvironmentEditing: () => setIsEnvironmentEditing(true),
  }
}

export function createVariablesTargetPanelStatus({
  isDeletingEnvironment,
  isEnvironmentActionDisabled,
  isEnvironmentEditing,
  isRefreshingEnvironments,
  isRefreshingRepositories,
  isTargetRefreshing,
}: {
  isDeletingEnvironment: boolean
  isEnvironmentActionDisabled: boolean
  isEnvironmentEditing: boolean
  isRefreshingEnvironments: boolean
  isRefreshingRepositories: boolean
  isTargetRefreshing: boolean
}): VariablesRouteScreenContainerProps['targetPanel']['status'] {
  return {
    isDeletingEnvironment,
    isEnvironmentActionDisabled,
    isEnvironmentEditing,
    isRefreshingEnvironments,
    isRefreshingRepositories,
    isScopeChangeDisabled: false,
    isTargetRefreshing,
  }
}

export function createVariablesTargetPanelProps({
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
}: {
  activeScope: SettingsScope
  clearEnvironmentEditing: () => void
  environmentSelectionError: string | null
  environments: VariablesRouteScreenContainerProps['targetPanel']['environments']
  handleEnvironmentChange: (nextEnvironment: string) => Promise<void>
  handleRepositoryChange: (nextRepository: string) => Promise<void>
  handleScopeChange: (nextScope: SettingsScope) => Promise<void>
  handleScopePrefetch: (nextScope: SettingsScope) => Promise<void>
  isDeletingEnvironment: boolean
  isEnvironmentActionDisabled: boolean
  isEnvironmentEditing: boolean
  isRefreshingEnvironments: boolean
  isRefreshingRepositories: boolean
  isTargetRefreshing: boolean
  openEnvironmentCreate: () => void
  refreshPageData: (options: { forceRefresh: boolean }) => Promise<void>
  repositories: VariablesRouteScreenContainerProps['targetPanel']['repositories']
  repositoryError: string | null
  requestDeleteEnvironment: () => void
  selectedEnvironment: string
  selectedRepository: string
  setIsEnvironmentEditing: (value: boolean) => void
  variablesMessages: VariablesMessages
}): VariablesRouteScreenContainerProps['targetPanel'] {
  return {
    actions: createVariablesTargetPanelActions({
      activeScope,
      clearEnvironmentEditing,
      handleEnvironmentChange,
      handleRepositoryChange,
      handleScopeChange,
      handleScopePrefetch,
      openEnvironmentCreate,
      refreshPageData,
      requestDeleteEnvironment,
      selectedEnvironment,
      selectedRepository,
      setIsEnvironmentEditing,
    }),
    activeScope,
    environmentSelectionError,
    environments,
    repositoryError,
    repositories,
    selectedEnvironment,
    selectedRepository,
    status: createVariablesTargetPanelStatus({
      isDeletingEnvironment,
      isEnvironmentActionDisabled,
      isEnvironmentEditing,
      isRefreshingEnvironments,
      isRefreshingRepositories,
      isTargetRefreshing,
    }),
    variablesMessages,
  }
}

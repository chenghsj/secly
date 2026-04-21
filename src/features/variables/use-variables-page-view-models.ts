import type {
  EditorTab,
  SettingsScope,
  VariablesEntrySortDirection,
  VariablesEntrySortField,
} from '#/lib/variables-route-search'
import type { AppLocale } from '#/messages'
import type { ReactNode } from 'react'
import {
  VariablesEntriesPanel,
  VariablesEntryEditorDialog,
  VariablesEnvironmentCreateDialog,
  VariablesGlobalSearchDialog,
  VariablesTargetPanel,
} from './variables-components'
import type {
  GlobalSearchResult,
  SettingsEntry,
  VariablesMessages,
} from './variables-types'
import type { SearchableSelectItem } from '#/components/ui/searchable-select'

type TargetPanelProps = Parameters<typeof VariablesTargetPanel>[0]
type EntriesPanelProps = Parameters<typeof VariablesEntriesPanel>[0]
type EntryEditorDialogProps = Parameters<typeof VariablesEntryEditorDialog>[0]
type GlobalSearchDialogProps = Parameters<typeof VariablesGlobalSearchDialog>[0]
type EnvironmentCreateDialogProps = Parameters<
  typeof VariablesEnvironmentCreateDialog
>[0]

export function useVariablesPageViewModels({
  activeScope,
  allFilteredEntriesSelected,
  bulkApplyLabel,
  bulkEntryPanel,
  canMutateCurrentScope,
  canMutateEntryEditorScope,
  currentEntries,
  entriesListState,
  entriesPanelActions,
  entryEditorActions,
  entryEditorDescription,
  entryEditorNeedsEnvironmentSelection,
  entryEditorRepository,
  entryEditorScope,
  entryEditorState,
  entryEditorTitle,
  environmentCreateActions,
  environmentCreateState,
  environmentOptions,
  environmentSelectionError,
  environments,
  environmentsRepository,
  filteredGlobalSearchResults,
  globalSearchActions,
  globalSearchState,
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
  targetPanelActions,
  targetStatus,
  valueColumnLabel,
  variablesMessages,
}: {
  activeScope: SettingsScope
  allFilteredEntriesSelected: boolean
  bulkApplyLabel: string
  bulkEntryPanel: ReactNode
  canMutateCurrentScope: boolean
  canMutateEntryEditorScope: boolean
  currentEntries: SettingsEntry[]
  entriesListState: {
    entrySortDirection: VariablesEntrySortDirection
    entrySortField: VariablesEntrySortField
    filteredEntries: SettingsEntry[]
    hasLoadedCurrentEntries: boolean
    isListActionDisabled: boolean
    isListLoading: boolean
    isTableEditing: boolean
    listEmptyDescription: string
    listEmptyTitle: string
    noMatchesTitle: string
    sortedFilteredEntries: SettingsEntry[]
  }
  entriesPanelActions: EntriesPanelProps['actions']
  entryEditorActions: EntryEditorDialogProps['actions']
  entryEditorDescription: string
  entryEditorNeedsEnvironmentSelection: boolean
  entryEditorRepository: string
  entryEditorScope: SettingsScope
  entryEditorState: {
    activeTab: EditorTab
    isBulkEditorActive: boolean
    isBulkSaving: boolean
    isSaving: boolean
    isSingleEntryEditor: boolean
    open: boolean
    parsedBulkEntryCount: number
    parsedBulkErrorCount: number
    saveActionLabel: string
  }
  entryEditorTitle: string
  environmentCreateActions: EnvironmentCreateDialogProps['actions']
  environmentCreateState: EnvironmentCreateDialogProps['state']
  environmentOptions: SearchableSelectItem[]
  environmentSelectionError: string | null
  environments: Array<{ name: string }>
  environmentsRepository: string
  filteredGlobalSearchResults: GlobalSearchResult[]
  globalSearchActions: GlobalSearchDialogProps['actions']
  globalSearchState: GlobalSearchDialogProps['state']
  hasPartiallySelectedEntries: boolean
  hasSelectedEntries: boolean
  locale: AppLocale
  repositoryError: string | null
  repositoryOptions: string[]
  repositories: Array<{ nameWithOwner: string }>
  scopeConfig: VariablesMessages['scopes'][keyof VariablesMessages['scopes']]
  searchInputId: string
  searchQuery: string
  selectedEntryNameSet: Set<string>
  selectedEnvironment: string
  selectedRepository: string
  singleEntryForm: ReactNode
  targetPanelActions: TargetPanelProps['actions']
  targetStatus: TargetPanelProps['status']
  valueColumnLabel: string
  variablesMessages: VariablesMessages
}) {
  const targetPanelProps = {
    actions: targetPanelActions,
    environment: {
      environments,
      error: environmentSelectionError,
      options: environmentOptions,
      selected: selectedEnvironment,
    },
    repository: {
      error: repositoryError,
      options: repositoryOptions,
      repositories,
      selected: selectedRepository,
    },
    scope: {
      activeScope,
    },
    status: targetStatus,
    variablesMessages,
  } satisfies TargetPanelProps

  const entriesPanelProps = {
    actions: entriesPanelActions,
    listState: {
      ...entriesListState,
      canMutateCurrentScope,
      currentEntries,
    },
    locale,
    scope: {
      activeScope,
      scopeConfig,
      valueColumnLabel,
    },
    search: {
      inputId: searchInputId,
      query: searchQuery,
    },
    selection: {
      allFilteredEntriesSelected,
      hasPartiallySelectedEntries,
      hasSelectedEntries,
      selectedEntryNameSet,
    },
    target: {
      environments,
      environmentsRepository,
      selectedEnvironment,
      selectedRepository,
    },
    variablesMessages,
  } satisfies EntriesPanelProps

  const globalSearchDialogProps = {
    actions: globalSearchActions,
    content: {
      locale,
    },
    state: {
      ...globalSearchState,
      filteredResults: filteredGlobalSearchResults,
      selectedRepository,
    },
    variablesMessages,
  } satisfies GlobalSearchDialogProps

  const entryEditorDialogProps = {
    actions: entryEditorActions,
    content: {
      bulkApplyLabel,
      bulkEntryPanel,
      description: entryEditorDescription,
      saveActionLabel: entryEditorState.saveActionLabel,
      singleEntryForm,
      title: entryEditorTitle,
    },
    state: {
      ...entryEditorState,
      canMutateEntryEditorScope,
      entryEditorNeedsEnvironmentSelection,
      entryEditorRepository,
      entryEditorScope,
    },
    variablesMessages,
  } satisfies EntryEditorDialogProps

  const environmentCreateDialogProps = {
    actions: environmentCreateActions,
    state: environmentCreateState,
    variablesMessages,
  } satisfies EnvironmentCreateDialogProps

  return {
    entriesPanelProps,
    entryEditorDialogProps,
    environmentCreateDialogProps,
    globalSearchDialogProps,
    targetPanelProps,
  }
}

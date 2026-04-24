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
import {
  VariablesEntriesPanel,
  type VariablesEntriesPanelProps,
} from './variables-entries-panel'

type ScopeConfig =
  VariablesMessages['scopes'][keyof VariablesMessages['scopes']]

export type VariablesEntriesPanelContainerProps = {
  actions: VariablesEntriesPanelProps['actions']
  activeScope: SettingsScope
  allFilteredEntriesSelected: boolean
  canMutateCurrentScope: boolean
  currentEntries: SettingsEntry[]
  entrySortDirection: VariablesEntrySortDirection
  entrySortField: VariablesEntrySortField
  environments: Array<{ name: string }>
  environmentsRepository: string
  filteredEntries: SettingsEntry[]
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
  scopeConfig: ScopeConfig
  selectedEntryNameSet: Set<string>
  selectedEnvironment: string
  selectedRepository: string
  sortedFilteredEntries: SettingsEntry[]
  valueColumnLabel: string
  variablesMessages: VariablesMessages
}

export function VariablesEntriesPanelContainer({
  actions,
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
}: VariablesEntriesPanelContainerProps) {
  return (
    <VariablesEntriesPanel
      actions={actions}
      listState={{
        canMutateCurrentScope,
        currentEntries,
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
      }}
      locale={locale}
      scope={{
        activeScope,
        scopeConfig,
        valueColumnLabel,
      }}
      search={{
        inputId,
        query,
      }}
      selection={{
        allFilteredEntriesSelected,
        hasPartiallySelectedEntries,
        hasSelectedEntries,
        selectedEntryNameSet,
      }}
      target={{
        environments,
        environmentsRepository,
        selectedEnvironment,
        selectedRepository,
      }}
      variablesMessages={variablesMessages}
    />
  )
}

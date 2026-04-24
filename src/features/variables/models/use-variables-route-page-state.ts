import type { SettingsScope } from '#/lib/variables-route-search'
import {
  formatMessage,
  getScopeConfig,
  getTargetLabel,
  isEnvironmentScope,
} from '#/features/variables/models/variables-helpers'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'

export function useVariablesRoutePageState({
  activeScope,
  environmentsRepository,
  hasLoadedCurrentEntries,
  isRefreshingEntries,
  isRefreshingEnvironments,
  isRefreshingRepositories,
  selectedEnvironment,
  selectedRepository,
  variablesMessages,
}: {
  activeScope: SettingsScope
  environmentsRepository: string
  hasLoadedCurrentEntries: boolean
  isRefreshingEntries: boolean
  isRefreshingEnvironments: boolean
  isRefreshingRepositories: boolean
  selectedEnvironment: string
  selectedRepository: string
  variablesMessages: VariablesMessages
}) {
  const scopeConfig = getScopeConfig(variablesMessages, activeScope)
  const scopeEntryPlural = scopeConfig.entryPluralLabel
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
  const isTargetRefreshing = isRefreshingRepositories
  const canMutateCurrentScope =
    Boolean(selectedRepository) &&
    (!isEnvironmentScope(activeScope) || Boolean(selectedEnvironment))

  return {
    canMutateCurrentScope,
    ids: {
      bulkInputErrorId: 'bulk-entry-error',
      bulkInputErrorListId: 'bulk-entry-error-list',
      bulkInputId: 'bulk-entry-input',
      deleteConfirmationInputId: 'delete-confirmation-input',
      entryNameErrorId: 'entry-name-error',
      entryNameInputId: 'entry-name-input',
      entryValueErrorId: 'entry-value-error',
      entryValueInputId: 'entry-value-input',
      environmentNameErrorId: 'environment-name-error',
      environmentNameInputId: 'environment-name-input',
      globalSearchInputId: 'global-entry-search-input',
      searchInputId: 'entry-search-input',
    },
    listEmptyDescription,
    listEmptyTitle,
    noMatchesTitle,
    status: {
      isEnvironmentActionDisabled,
      isListActionDisabled,
      isListLoading,
      isPageRefreshing,
      isTargetRefreshing,
      isWaitingForCurrentEntries,
    },
  }
}

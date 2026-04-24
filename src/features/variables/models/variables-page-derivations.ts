import type { SearchableSelectItem } from '#/components/ui/searchable-select'
import type {
  SettingsScope,
  VariablesEntrySortDirection,
  VariablesEntrySortField,
} from '#/lib/variables-route-search'
import type {
  GhActionsSecret,
  GhActionsVariable,
  GhEnvironmentSummary,
} from '#/server/gh-actions-settings.server'
import type {
  GhRepositorySummary,
  GhRepositoryVariable,
} from '#/server/gh-repository-variables.server'
import type {
  GlobalSearchResult,
  SettingsEntry,
} from '#/features/variables/domain/variables-types'
import {
  compareSettingsEntries,
  isSecretScope,
  resolvePreferredEnvironmentName,
} from '#/features/variables/models/variables-helpers'

export function resolveSelectedRepository({
  initialRepository,
  repositories,
  searchRepository,
}: {
  initialRepository: string
  repositories: GhRepositorySummary[]
  searchRepository?: string
}) {
  if (
    searchRepository &&
    repositories.some(
      (repository) => repository.nameWithOwner === searchRepository,
    )
  ) {
    return searchRepository
  }

  return repositories[0]?.nameWithOwner ?? initialRepository
}

export function resolveSelectedEnvironment({
  activeScope,
  environments,
  environmentsRepository,
  searchEnvironment,
  selectedRepository,
}: {
  activeScope: SettingsScope
  environments: GhEnvironmentSummary[]
  environmentsRepository: string
  searchEnvironment?: string
  selectedRepository: string
}) {
  if (
    searchEnvironment &&
    environments.some((environment) => environment.name === searchEnvironment)
  ) {
    return searchEnvironment
  }

  if (environmentsRepository !== selectedRepository) {
    return ''
  }

  return resolvePreferredEnvironmentName({
    activeScope,
    environments,
    requestedEnvironment: searchEnvironment,
  })
}

export function createRepositoryOptions(repositories: GhRepositorySummary[]) {
  return repositories.map((repository) => repository.nameWithOwner)
}

export function createEnvironmentOptions({
  emptyOptionLabel,
  environments,
}: {
  emptyOptionLabel: string
  environments: GhEnvironmentSummary[]
}): SearchableSelectItem[] {
  const populatedEnvironments = environments.filter(
    (environment) => environment.variableCount > 0,
  )
  const emptyEnvironments = environments.filter(
    (environment) => environment.variableCount === 0,
  )

  return [...populatedEnvironments, ...emptyEnvironments].map(
    (environment) => ({
      label:
        environment.variableCount === 0
          ? `${environment.name} ${emptyOptionLabel}`
          : environment.name,
      value: environment.name,
    }),
  )
}

export function getCurrentEntriesForScope({
  activeScope,
  environmentSecrets,
  environmentVariables,
  repositorySecrets,
  repositoryVariables,
}: {
  activeScope: SettingsScope
  environmentSecrets: GhActionsSecret[]
  environmentVariables: GhActionsVariable[]
  repositorySecrets: GhActionsSecret[]
  repositoryVariables: GhRepositoryVariable[]
}): SettingsEntry[] {
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
}

export function hasLoadedEntriesForScope({
  activeScope,
  environmentSecretsKey,
  environmentVariablesKey,
  repositorySecretsRepository,
  repositoryVariablesRepository,
  selectedEnvironment,
  selectedRepository,
}: {
  activeScope: SettingsScope
  environmentSecretsKey: string
  environmentVariablesKey: string
  repositorySecretsRepository: string
  repositoryVariablesRepository: string
  selectedEnvironment: string
  selectedRepository: string
}) {
  const environmentKey = `${selectedRepository}:${selectedEnvironment}`

  switch (activeScope) {
    case 'repository-variables':
      return repositoryVariablesRepository === selectedRepository
    case 'repository-secrets':
      return repositorySecretsRepository === selectedRepository
    case 'environment-variables':
      return environmentVariablesKey === environmentKey
    case 'environment-secrets':
      return environmentSecretsKey === environmentKey
    default:
      return false
  }
}

export function filterSettingsEntries({
  currentEntries,
  query,
}: {
  currentEntries: SettingsEntry[]
  query: string
}) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return currentEntries
  }

  return currentEntries.filter((entry) => {
    const searchableValue = entry.value ?? ''
    const searchableVisibility = entry.visibility ?? ''

    return (
      entry.name.toLowerCase().includes(normalizedQuery) ||
      searchableValue.toLowerCase().includes(normalizedQuery) ||
      searchableVisibility.toLowerCase().includes(normalizedQuery)
    )
  })
}

export function filterGlobalResultsForRepository({
  globalSearchRepository,
  query,
  results,
  selectedRepository,
}: {
  globalSearchRepository: string
  query: string
  results: GlobalSearchResult[]
  selectedRepository: string
}) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery || globalSearchRepository !== selectedRepository) {
    return []
  }

  return results.filter(
    (result) =>
      result.repository === selectedRepository &&
      result.searchText.includes(normalizedQuery),
  )
}

export function sortFilteredEntries({
  activeScope,
  collator,
  direction,
  entries,
  field,
}: {
  activeScope: SettingsScope
  collator: Intl.Collator
  direction: VariablesEntrySortDirection
  entries: SettingsEntry[]
  field: VariablesEntrySortField
}) {
  return [...entries].sort((left, right) =>
    compareSettingsEntries(left, right, {
      collator,
      direction,
      field,
      isSecretScopeActive: isSecretScope(activeScope),
    }),
  )
}

export function createSelectionState({
  filteredEntries,
  selectedEntryNames,
}: {
  filteredEntries: SettingsEntry[]
  selectedEntryNames: string[]
}) {
  const selectedEntryNameSet = new Set(selectedEntryNames)
  const hasSelectedEntries = selectedEntryNames.length > 0
  const allFilteredEntriesSelected =
    filteredEntries.length > 0 &&
    filteredEntries.every((entry) => selectedEntryNameSet.has(entry.name))
  const hasPartiallySelectedEntries =
    !allFilteredEntriesSelected &&
    filteredEntries.some((entry) => selectedEntryNameSet.has(entry.name))

  return {
    allFilteredEntriesSelected,
    hasPartiallySelectedEntries,
    hasSelectedEntries,
    selectedEntryNameSet,
  }
}

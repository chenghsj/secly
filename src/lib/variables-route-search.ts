export type EditorTab = 'bulk' | 'single'

export type VariablesEntrySortField = 'name' | 'updated' | 'value'

export type VariablesEntrySortDirection = 'asc' | 'desc'

export type VariablesEntrySort =
  `${VariablesEntrySortField}:${VariablesEntrySortDirection}`

export type SettingsScope =
  | 'repository-variables'
  | 'repository-secrets'
  | 'environment-variables'
  | 'environment-secrets'

export type VariablesSearch = {
  environment?: string
  query?: string
  repository?: string
  sort?: VariablesEntrySort
  scope?: SettingsScope
  tab?: EditorTab
}

const validScopes = new Set<SettingsScope>([
  'environment-secrets',
  'environment-variables',
  'repository-secrets',
  'repository-variables',
])
const validEditorTabs = new Set<EditorTab>(['bulk', 'single'])
const validVariablesEntrySorts = new Set<VariablesEntrySort>([
  'name:asc',
  'name:desc',
  'updated:asc',
  'updated:desc',
  'value:asc',
  'value:desc',
])
const defaultSortDirectionByField: Record<
  VariablesEntrySortField,
  VariablesEntrySortDirection
> = {
  name: 'asc',
  updated: 'desc',
  value: 'asc',
}

export const defaultVariablesEntrySort: VariablesEntrySort = 'name:asc'

export function getNextVariablesEntrySort(
  currentSort: VariablesEntrySort,
  field: VariablesEntrySortField,
): VariablesEntrySort {
  const [currentField, currentDirection] = currentSort.split(':') as [
    VariablesEntrySortField,
    VariablesEntrySortDirection,
  ]

  if (currentField !== field) {
    return `${field}:${defaultSortDirectionByField[field]}`
  }

  return `${field}:${currentDirection === 'asc' ? 'desc' : 'asc'}`
}

function hasSearchKey(
  search: Partial<VariablesSearch>,
  key: keyof VariablesSearch,
) {
  return Object.prototype.hasOwnProperty.call(search, key)
}

export function validateVariablesSearch(
  search: Record<string, unknown>,
): VariablesSearch {
  const repository =
    typeof search.repository === 'string' && search.repository.trim()
      ? search.repository.trim()
      : undefined
  const scope =
    typeof search.scope === 'string' &&
    validScopes.has(search.scope as SettingsScope)
      ? (search.scope as SettingsScope)
      : undefined
  const environment =
    typeof search.environment === 'string' && search.environment.trim()
      ? search.environment.trim()
      : undefined
  const sort =
    typeof search.sort === 'string' &&
    validVariablesEntrySorts.has(search.sort as VariablesEntrySort)
      ? (search.sort as VariablesEntrySort)
      : undefined
  const tab =
    typeof search.tab === 'string' &&
    validEditorTabs.has(search.tab as EditorTab)
      ? (search.tab as EditorTab)
      : undefined
  const query =
    typeof search.query === 'string' && search.query.trim()
      ? search.query
      : undefined

  const scopeIsEnvironment =
    scope === 'environment-variables' || scope === 'environment-secrets'

  return {
    environment: scope && !scopeIsEnvironment ? undefined : environment,
    query,
    repository,
    sort,
    scope,
    tab,
  }
}

export function mergeVariablesSearchUpdate(
  previous: VariablesSearch,
  nextValues: Partial<VariablesSearch>,
): VariablesSearch {
  return {
    ...previous,
    ...nextValues,
    environment: hasSearchKey(nextValues, 'environment')
      ? nextValues.environment || undefined
      : previous.environment,
    query: hasSearchKey(nextValues, 'query')
      ? nextValues.query || undefined
      : previous.query,
    repository: hasSearchKey(nextValues, 'repository')
      ? nextValues.repository || undefined
      : previous.repository,
    sort: hasSearchKey(nextValues, 'sort') ? nextValues.sort : previous.sort,
    scope: hasSearchKey(nextValues, 'scope')
      ? nextValues.scope
      : previous.scope,
    tab: hasSearchKey(nextValues, 'tab') ? nextValues.tab : previous.tab,
  }
}

import type {
  SettingsScope,
  VariablesSearch,
} from '#/lib/variables-route-search'
import type { VariablesStore } from './variables-store'
import { isEnvironmentScope } from './variables-selectors'

type UpdateVariablesSearch = (
  nextValues: Partial<VariablesSearch>,
  options?: {
    replace?: boolean
  },
) => Promise<void>

export async function applyRepositoryViewChange(
  store: Pick<
    VariablesStore,
    | 'clearEnvironmentEditing'
    | 'clearTableEditing'
    | 'closeEntryEditorImmediately'
    | 'closeEnvironmentCreateImmediately'
    | 'resetRepositoryScopedData'
    | 'setEnvironmentSelectionError'
    | 'setRepositoryError'
  >,
  deps: {
    abortAllManagedRequests: () => void
    selectedRepository: string
    updateVariablesSearch: UpdateVariablesSearch
  },
  nextRepository: string,
) {
  if (nextRepository === deps.selectedRepository) {
    return
  }

  deps.abortAllManagedRequests()
  store.setRepositoryError(null)
  store.setEnvironmentSelectionError(null)
  store.closeEnvironmentCreateImmediately()
  store.closeEntryEditorImmediately()
  store.clearEnvironmentEditing()
  store.clearTableEditing()
  store.resetRepositoryScopedData()

  await deps.updateVariablesSearch({
    environment: undefined,
    query: undefined,
    repository: nextRepository || undefined,
    tab: 'single',
  })
}

export async function applyScopeViewChange(
  store: Pick<
    VariablesStore,
    | 'clearEnvironmentEditing'
    | 'clearTableEditing'
    | 'closeEntryEditorImmediately'
    | 'closeEnvironmentCreateImmediately'
    | 'setEnvironmentSelectionError'
    | 'setRepositoryError'
  >,
  deps: {
    abortAllManagedRequests: () => void
    activeScope: SettingsScope
    updateVariablesSearch: UpdateVariablesSearch
  },
  nextScope: SettingsScope,
) {
  if (nextScope === deps.activeScope) {
    return
  }

  deps.abortAllManagedRequests()
  store.setRepositoryError(null)
  store.setEnvironmentSelectionError(null)
  store.closeEnvironmentCreateImmediately()
  store.closeEntryEditorImmediately()
  store.clearEnvironmentEditing()
  store.clearTableEditing()

  const searchUpdate: Partial<VariablesSearch> = {
    query: undefined,
    scope: nextScope,
    tab: 'single',
  }

  if (!isEnvironmentScope(nextScope)) {
    searchUpdate.environment = undefined
  }

  await deps.updateVariablesSearch(searchUpdate)
}

export async function applyEnvironmentViewChange(
  store: Pick<
    VariablesStore,
    | 'clearTableEditing'
    | 'closeEntryEditorImmediately'
    | 'setEnvironmentSelectionError'
  >,
  deps: {
    selectedEnvironment: string
    updateVariablesSearch: UpdateVariablesSearch
  },
  nextEnvironment: string,
) {
  if (nextEnvironment === deps.selectedEnvironment) {
    return
  }

  store.setEnvironmentSelectionError(null)
  store.closeEntryEditorImmediately()
  store.clearTableEditing()

  await deps.updateVariablesSearch({
    environment: nextEnvironment || undefined,
    query: undefined,
  })
}

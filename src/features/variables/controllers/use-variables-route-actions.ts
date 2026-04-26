import { toast } from 'sonner'
import type {
  SettingsScope,
  VariablesSearch,
} from '#/lib/variables-route-search'
import {
  createEnvironmentForRepository,
  saveEntryForScope,
} from '#/features/variables/domain/variables-actions'
import {
  openEntryEditorForScope,
  startCreateEntryEditor,
} from '#/features/variables/domain/variables-entry-editor'
import { toggleVariableLock as toggleVariableLockServerFn } from '#/server/gh-repository-variables.functions'
import {
  upsertEntryInScopeStore,
  type ScopeStoreControls,
} from '#/features/variables/domain/variables-scope-strategies'
import {
  formatMessage,
  getScopeConfig,
  getTargetLabel,
  isEnvironmentScope,
  isSecretScope,
  upsertEntryList,
} from '#/features/variables/models/variables-helpers'
import type {
  GlobalSearchResult,
  SettingsEntry,
  VariablesMessages,
} from '#/features/variables/domain/variables-types'
import type { VariablesStore } from '#/features/variables/state/variables-store'
import type { GhEnvironmentSummary } from '#/server/gh-actions-settings.server'

type UpdateVariablesSearch = (
  nextValues: Partial<VariablesSearch>,
  options?: {
    replace?: boolean
  },
) => Promise<void>

type RouteActionStore = Pick<
  VariablesStore,
  | 'clearEntryEditorDrafts'
  | 'clearEnvironmentEditing'
  | 'closeEnvironmentCreateImmediately'
  | 'setEditingEntryName'
  | 'setEntryEditorContext'
  | 'setEnvironmentName'
  | 'setEnvironmentNameError'
  | 'setEnvironmentSelectionError'
  | 'setEnvironments'
  | 'setEnvironmentsRepository'
  | 'setGlobalSearchResults'
  | 'setIsCreatingEnvironment'
  | 'setIsEntryEditorOpen'
  | 'setIsEnvironmentCreateOpen'
  | 'setIsGlobalSearchDialogOpen'
  | 'setName'
  | 'setRepositoryError'
  | 'setSelectedEntryNames'
  | 'setShouldRestoreGlobalSearchAfterEditorClose'
  | 'setValue'
> &
  ScopeStoreControls

type RouteActionSelection = {
  activeScope: SettingsScope
  allFilteredEntriesSelected: boolean
  editingEntryName: string | null
  environmentName: string
  filteredEntries: SettingsEntry[]
  isGlobalSearchDialogOpen: boolean
  selectedEnvironment: string
  selectedRepository: string
}

type RouteActionOrchestration = {
  loadEnvironmentSecretsForSelection: (
    repository: string,
    environmentName: string,
  ) => Promise<void>
  loadEnvironmentVariablesForSelection: (
    repository: string,
    environmentName: string,
  ) => Promise<void>
  resetGlobalSearchData: () => void
  updateVariablesSearch: UpdateVariablesSearch
}

export function useVariablesRouteActions({
  orchestration: {
    loadEnvironmentSecretsForSelection,
    loadEnvironmentVariablesForSelection,
    resetGlobalSearchData,
    updateVariablesSearch,
  },
  selection: {
    activeScope,
    allFilteredEntriesSelected,
    editingEntryName,
    environmentName,
    filteredEntries,
    isGlobalSearchDialogOpen,
    selectedEnvironment,
    selectedRepository,
  },
  store,
  variablesMessages,
}: {
  orchestration: RouteActionOrchestration
  selection: RouteActionSelection
  store: RouteActionStore
  variablesMessages: VariablesMessages
}) {
  function startCreateEntry() {
    const scopeConfig = getScopeConfig(variablesMessages, activeScope)

    store.setRepositoryError(null)
    store.setEnvironmentSelectionError(null)

    if (!selectedRepository) {
      store.setRepositoryError(
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
      store.setEnvironmentSelectionError(
        variablesMessages.validation.selectEnvironmentBeforeSaving,
      )
      return
    }

    startCreateEntryEditor(
      {
        clearEntryEditorDrafts: store.clearEntryEditorDrafts,
        setEntryEditorContext: store.setEntryEditorContext,
        setIsEntryEditorOpen: store.setIsEntryEditorOpen,
        setIsGlobalSearchDialogOpen: store.setIsGlobalSearchDialogOpen,
        setShouldRestoreGlobalSearchAfterEditorClose:
          store.setShouldRestoreGlobalSearchAfterEditorClose,
      },
      {
        activeScope,
        selectedEnvironment,
        selectedRepository,
      },
    )
  }

  function openEnvironmentCreate() {
    store.setRepositoryError(null)
    store.setEnvironmentNameError(null)

    if (!selectedRepository) {
      store.setRepositoryError(
        variablesMessages.validation.selectRepositoryBeforeCreateEnvironment,
      )
      return
    }

    store.setEnvironmentName('')
    store.setIsEnvironmentCreateOpen(true)
  }

  function applyEditEntryForScope(entry: SettingsEntry, scope: SettingsScope) {
    store.setRepositoryError(null)
    store.setEnvironmentSelectionError(null)

    openEntryEditorForScope(
      {
        clearEntryEditorDrafts: store.clearEntryEditorDrafts,
        setEditingEntryName: store.setEditingEntryName,
        setEntryEditorContext: store.setEntryEditorContext,
        setIsEntryEditorOpen: store.setIsEntryEditorOpen,
        setIsGlobalSearchDialogOpen: store.setIsGlobalSearchDialogOpen,
        setName: store.setName,
        setShouldRestoreGlobalSearchAfterEditorClose:
          store.setShouldRestoreGlobalSearchAfterEditorClose,
        setValue: store.setValue,
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

    applyEditEntryForScope(entry, activeScope)
  }

  async function saveGlobalSearchResult(
    result: GlobalSearchResult,
    newValue: string,
  ) {
    const scopeConfig = getScopeConfig(variablesMessages, result.scope)
    const saveResult = await saveEntryForScope({
      environmentName: result.environmentName ?? '',
      name: result.name,
      repository: result.repository,
      scope: result.scope,
      value: newValue,
    })

    store.setGlobalSearchResults((current: GlobalSearchResult[]) =>
      current.map((currentResult: GlobalSearchResult) =>
        currentResult.id === result.id
          ? { ...currentResult, ...saveResult.entry }
          : currentResult,
      ),
    )

    upsertEntryInScopeStore({
      entry: saveResult.entry,
      environmentName: result.environmentName ?? '',
      repository: result.repository,
      scope: result.scope,
      store,
    })

    toast.success(
      formatMessage(variablesMessages.feedback.updated, {
        entryTitle: scopeConfig.entryTitle,
      }),
      {
        description: formatMessage(
          isSecretScope(result.scope)
            ? variablesMessages.feedback.metadataAvailableInTarget
            : variablesMessages.feedback.savedInTarget,
          {
            name: result.name,
            target: getTargetLabel(
              result.repository,
              result.environmentName ?? '',
              result.scope,
            ),
          },
        ),
      },
    )
  }

  function toggleAllFilteredEntries() {
    store.setSelectedEntryNames((current: string[]) => {
      const currentSelection = new Set(current)

      if (allFilteredEntriesSelected) {
        filteredEntries.forEach((entry) => {
          if (!entry.isLocked) {
            currentSelection.delete(entry.name)
          }
        })
      } else {
        filteredEntries.forEach((entry) => {
          if (!entry.isLocked) {
            currentSelection.add(entry.name)
          }
        })
      }

      return Array.from(currentSelection)
    })
  }

  async function handleCreateEnvironment() {
    store.setRepositoryError(null)
    store.setEnvironmentNameError(null)

    if (!selectedRepository) {
      store.setRepositoryError(
        variablesMessages.validation.selectRepositoryBeforeCreateEnvironment,
      )
      return
    }

    const trimmedEnvironmentName = environmentName.trim()

    if (!trimmedEnvironmentName) {
      store.setEnvironmentNameError(
        variablesMessages.validation.environmentNameRequired,
      )
      return
    }

    store.setIsCreatingEnvironment(true)

    try {
      const environment = await createEnvironmentForRepository({
        environmentName: trimmedEnvironmentName,
        repository: selectedRepository,
      })

      store.setEnvironments((current: GhEnvironmentSummary[]) =>
        upsertEntryList(current, environment),
      )
      store.setEnvironmentsRepository(selectedRepository)
      resetGlobalSearchData()
      store.clearEnvironmentEditing()
      store.closeEnvironmentCreateImmediately()
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
      store.setIsCreatingEnvironment(false)
    }
  }

  async function toggleVariableLock(entryName: string, isLocked: boolean) {
    try {
      await toggleVariableLockServerFn({
        data: {
          name: entryName,
          repository: selectedRepository,
          isLocked,
          scope: activeScope,
          environmentName: selectedEnvironment,
        },
      })

      const updater = (current: any[]) =>
        current.map((v: any) =>
          v.name === entryName ? { ...v, isLocked } : v,
        )

      switch (activeScope) {
        case 'repository-variables':
          if ('setRepositoryVariables' in store) {
            // @ts-ignore
            store.setRepositoryVariables(updater)
          }
          break
        case 'repository-secrets':
          if ('setRepositorySecrets' in store) {
            // @ts-ignore
            store.setRepositorySecrets(updater)
          }
          break
        case 'environment-variables':
          if ('setEnvironmentVariables' in store) {
            // @ts-ignore
            store.setEnvironmentVariables(updater)
          }
          break
        case 'environment-secrets':
          if ('setEnvironmentSecrets' in store) {
            // @ts-ignore
            store.setEnvironmentSecrets(updater)
          }
          break
      }

      toast.success(
        isLocked
          ? `Locked ${entryName} successfully.`
          : `Unlocked ${entryName} successfully.`,
      )
    } catch (error) {
      toast.error('Failed to toggle lock', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    handleCreateEnvironment,
    openEnvironmentCreate,
    saveGlobalSearchResult,
    startCreateEntry,
    startEditingEntry,
    toggleAllFilteredEntries,
    toggleVariableLock,
  }
}

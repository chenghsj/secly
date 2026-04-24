import { useEffect } from 'react'
import { toast } from 'sonner'
import type { SettingsScope } from '#/lib/variables-route-search'
import {
  deleteEntryForScope,
  deleteEnvironmentForRepository,
} from '#/features/variables/domain/variables-actions'
import { removeEntriesFromScopeStore } from '#/features/variables/domain/variables-scope-strategies'
import {
  buildPendingDeleteStateCopy,
  formatMessage,
  getCountLabel,
  getScopeConfig,
  getTargetLabel,
  isEnvironmentScope,
} from '#/features/variables/models/variables-helpers'
import type { VariablesStore } from '#/features/variables/state/variables-store'
import type {
  PendingDeleteState,
  VariablesMessages,
} from '#/features/variables/domain/variables-types'
import type { GhEnvironmentSummary } from '#/server/gh-actions-settings.server'

type StoreControls = Pick<
  VariablesStore,
  | 'closeEntryEditorImmediately'
  | 'closeEnvironmentCreateImmediately'
  | 'setDeleteConfirmationValue'
  | 'setEnvironmentSecrets'
  | 'setEnvironmentSecretsKey'
  | 'setEnvironmentSelectionError'
  | 'setEnvironmentVariables'
  | 'setEnvironmentVariablesKey'
  | 'setEnvironments'
  | 'setIsDeletingEntries'
  | 'setIsDeletingEnvironment'
  | 'setPendingDelete'
  | 'setRepositorySecrets'
  | 'setRepositorySecretsRepository'
  | 'setRepositoryVariables'
  | 'setRepositoryVariablesRepository'
  | 'setSelectedEntryNames'
>

type OrchestrationControls = {
  clearEnvironmentEditing: () => void
  clearTableEditing: () => void
  loadEnvironmentSecretsForSelection: (
    repository: string,
    environmentName: string,
  ) => Promise<void>
  loadEnvironmentVariablesForSelection: (
    repository: string,
    environmentName: string,
  ) => Promise<void>
  resetGlobalSearchData: () => void
  updateVariablesSearch: (
    nextValues: { environment?: string },
    options?: { replace?: boolean },
  ) => Promise<void>
}

type DeleteControllerSelection = {
  activeScope: SettingsScope
  editingEntryName: string | null
  environments: GhEnvironmentSummary[]
  hasSelectedEntries: boolean
  selectedEntryNames: string[]
  selectedEnvironment: string
  selectedRepository: string
}

type DeleteControllerState = {
  deleteConfirmationInputId: string
  deleteConfirmationValue: string
  isDeletingEntries: boolean
  isDeletingEnvironment: boolean
  pendingDelete: PendingDeleteState | null
}

type DeleteControllerDependencies = {
  orchestration: OrchestrationControls
  store: StoreControls
  variablesMessages: VariablesMessages
}

export function buildEntriesPendingDeleteRequest({
  activeScope,
  entryNames,
  selectedEnvironment,
  selectedRepository,
  variablesMessages,
}: {
  activeScope: SettingsScope
  entryNames: string[]
  selectedEnvironment: string
  selectedRepository: string
  variablesMessages: VariablesMessages
}) {
  if (!selectedRepository || entryNames.length === 0) {
    return {
      environmentSelectionError: null,
      pendingDelete: null,
    }
  }

  if (isEnvironmentScope(activeScope) && !selectedEnvironment) {
    return {
      environmentSelectionError:
        variablesMessages.validation.selectEnvironmentBeforeDeleting,
      pendingDelete: null,
    }
  }

  return {
    environmentSelectionError: null,
    pendingDelete: {
      entryNames,
      environmentName: selectedEnvironment,
      kind: 'entries' as const,
      repository: selectedRepository,
      scope: activeScope,
      targetLabel: getTargetLabel(
        selectedRepository,
        selectedEnvironment,
        activeScope,
      ),
    },
  }
}

export function buildEnvironmentPendingDeleteRequest({
  selectedEnvironment,
  selectedRepository,
  variablesMessages,
}: {
  selectedEnvironment: string
  selectedRepository: string
  variablesMessages: VariablesMessages
}) {
  if (!selectedRepository || !selectedEnvironment) {
    return {
      environmentSelectionError:
        variablesMessages.validation.selectEnvironmentBeforeDeleting,
      pendingDelete: null,
    }
  }

  return {
    environmentSelectionError: null,
    pendingDelete: {
      environmentName: selectedEnvironment,
      kind: 'environment' as const,
      repository: selectedRepository,
    },
  }
}

export function shouldClearPendingDeleteOnOpenChange({
  isDeleteConfirming,
  open,
}: {
  isDeleteConfirming: boolean
  open: boolean
}) {
  return !open && !isDeleteConfirming
}

export function useVariablesDeleteController({
  dependencies: { orchestration, store, variablesMessages },
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
}: {
  dependencies: DeleteControllerDependencies
  selection: DeleteControllerSelection
  state: DeleteControllerState
}) {
  const isDeleteConfirming = isDeletingEntries || isDeletingEnvironment
  const { setDeleteConfirmationValue, setPendingDelete } = store

  const {
    pendingDeleteActionLabel,
    pendingDeleteConfirmationValue,
    pendingDeleteDescription,
    pendingDeleteEntryNames,
    pendingDeleteTitle,
  } = buildPendingDeleteStateCopy({
    pendingDelete,
    variablesMessages,
  })
  const requiresTypedDeleteConfirmation =
    pendingDeleteConfirmationValue !== null
  const isTypedDeleteConfirmationMatched =
    !requiresTypedDeleteConfirmation ||
    deleteConfirmationValue === pendingDeleteConfirmationValue

  function requestDeleteEntries(entryNames: string[]) {
    const { environmentSelectionError, pendingDelete: nextPendingDelete } =
      buildEntriesPendingDeleteRequest({
        activeScope,
        entryNames,
        selectedEnvironment,
        selectedRepository,
        variablesMessages,
      })

    if (!nextPendingDelete && !environmentSelectionError) {
      return
    }

    if (environmentSelectionError) {
      store.setEnvironmentSelectionError(environmentSelectionError)
      return
    }

    setPendingDelete(nextPendingDelete)
  }

  function requestDeleteSelectedEntries() {
    if (!hasSelectedEntries) {
      return
    }

    requestDeleteEntries(selectedEntryNames)
  }

  function requestDeleteEnvironment() {
    const { environmentSelectionError, pendingDelete: nextPendingDelete } =
      buildEnvironmentPendingDeleteRequest({
        selectedEnvironment,
        selectedRepository,
        variablesMessages,
      })

    if (environmentSelectionError) {
      store.setEnvironmentSelectionError(environmentSelectionError)
      return
    }

    setPendingDelete(nextPendingDelete)
  }

  async function confirmDeleteEntries(
    deleteRequest: Extract<PendingDeleteState, { kind: 'entries' }>,
  ) {
    const deleteScopeConfig = getScopeConfig(
      variablesMessages,
      deleteRequest.scope,
    )
    const deletedNames: string[] = []

    store.setIsDeletingEntries(true)

    try {
      for (const entryName of deleteRequest.entryNames) {
        await deleteEntryForScope(deleteRequest, entryName)
        deletedNames.push(entryName)
      }

      removeEntriesFromScopeStore({
        deletedNames,
        scope: deleteRequest.scope,
        store,
      })
      orchestration.resetGlobalSearchData()
      store.setSelectedEntryNames((current) =>
        current.filter((selectedName) => !deletedNames.includes(selectedName)),
      )

      if (editingEntryName && deletedNames.includes(editingEntryName)) {
        store.closeEntryEditorImmediately()
      }

      orchestration.clearTableEditing()

      toast.success(
        formatMessage(variablesMessages.feedback.entriesDeleted, {
          count: deletedNames.length,
          entries: getCountLabel(
            deletedNames.length,
            deleteScopeConfig.entryLabel,
            deleteScopeConfig.entryPluralLabel,
          ),
        }),
        {
          description: formatMessage(
            variablesMessages.feedback.entriesDeletedDescription,
            {
              count: deletedNames.length,
              entries: getCountLabel(
                deletedNames.length,
                deleteScopeConfig.entryLabel,
                deleteScopeConfig.entryPluralLabel,
              ),
              target: deleteRequest.targetLabel,
            },
          ),
        },
      )
      setPendingDelete(null)
    } catch (error) {
      if (deletedNames.length > 0) {
        removeEntriesFromScopeStore({
          deletedNames,
          scope: deleteRequest.scope,
          store,
        })
        orchestration.resetGlobalSearchData()
        store.setSelectedEntryNames((current) =>
          current.filter(
            (selectedName) => !deletedNames.includes(selectedName),
          ),
        )

        if (editingEntryName && deletedNames.includes(editingEntryName)) {
          store.closeEntryEditorImmediately()
        }
      }

      toast.error(
        formatMessage(variablesMessages.errors.deleteSelectedFailed, {
          entries: getCountLabel(
            deleteRequest.entryNames.length,
            deleteScopeConfig.entryLabel,
            deleteScopeConfig.entryPluralLabel,
          ),
        }),
        {
          description:
            error instanceof Error
              ? error.message
              : formatMessage(variablesMessages.errors.deleteSelectedFailed, {
                  entries: getCountLabel(
                    deleteRequest.entryNames.length,
                    deleteScopeConfig.entryLabel,
                    deleteScopeConfig.entryPluralLabel,
                  ),
                }),
        },
      )
      setPendingDelete(null)
    } finally {
      store.setIsDeletingEntries(false)
    }
  }

  async function confirmDeleteEnvironment(
    deleteRequest: Extract<PendingDeleteState, { kind: 'environment' }>,
  ) {
    store.setIsDeletingEnvironment(true)

    try {
      await deleteEnvironmentForRepository({
        environmentName: deleteRequest.environmentName,
        repository: deleteRequest.repository,
      })

      const remainingEnvironments = environments.filter(
        (environment) => environment.name !== deleteRequest.environmentName,
      )
      const nextEnvironment = remainingEnvironments[0]?.name ?? ''

      orchestration.resetGlobalSearchData()
      store.setEnvironments(remainingEnvironments)
      store.setEnvironmentVariables([])
      store.setEnvironmentVariablesKey('')
      store.setEnvironmentSecrets([])
      store.setEnvironmentSecretsKey('')
      store.closeEntryEditorImmediately()
      orchestration.clearTableEditing()
      orchestration.clearEnvironmentEditing()
      store.closeEnvironmentCreateImmediately()
      await orchestration.updateVariablesSearch(
        {
          environment: nextEnvironment || undefined,
        },
        {
          replace: true,
        },
      )

      if (nextEnvironment) {
        if (activeScope === 'environment-variables') {
          await orchestration.loadEnvironmentVariablesForSelection(
            deleteRequest.repository,
            nextEnvironment,
          )
        } else {
          await orchestration.loadEnvironmentSecretsForSelection(
            deleteRequest.repository,
            nextEnvironment,
          )
        }
      }

      toast.success(variablesMessages.feedback.environmentDeleted, {
        description: formatMessage(
          variablesMessages.feedback.environmentDeletedDescription,
          {
            name: deleteRequest.environmentName,
            repository: deleteRequest.repository,
          },
        ),
      })
      setPendingDelete(null)
    } catch (error) {
      toast.error(variablesMessages.errors.deleteEnvironmentFailed, {
        description:
          error instanceof Error
            ? error.message
            : variablesMessages.errors.deleteEnvironmentFailed,
      })
    } finally {
      store.setIsDeletingEnvironment(false)
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) {
      return
    }

    if (pendingDelete.kind === 'entries') {
      await confirmDeleteEntries(pendingDelete)
      return
    }

    await confirmDeleteEnvironment(pendingDelete)
  }

  function handleCopyDeleteConfirmationValue() {
    if (!pendingDeleteConfirmationValue) {
      return
    }

    try {
      void navigator.clipboard
        .writeText(pendingDeleteConfirmationValue)
        .then(() =>
          toast.success(variablesMessages.deleteDialog.confirmationCopied),
        )
        .catch(() =>
          toast.error(variablesMessages.deleteDialog.confirmationCopyFailed),
        )
    } catch {
      toast.error(variablesMessages.deleteDialog.confirmationCopyFailed)
    }
  }

  useEffect(() => {
    setDeleteConfirmationValue('')
  }, [pendingDeleteConfirmationValue, setDeleteConfirmationValue])

  useEffect(() => {
    if (!requiresTypedDeleteConfirmation) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      const target = document.getElementById(deleteConfirmationInputId)

      if (target instanceof HTMLInputElement) {
        target.focus()
        target.select()
      }
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [deleteConfirmationInputId, requiresTypedDeleteConfirmation])

  return {
    deleteDialog: {
      actions: {
        onConfirm: () => {
          void handleConfirmDelete()
        },
        onConfirmationValueChange: setDeleteConfirmationValue,
        onCopyConfirmationValue: handleCopyDeleteConfirmationValue,
        onOpenChange: (open: boolean) => {
          if (
            shouldClearPendingDeleteOnOpenChange({
              isDeleteConfirming,
              open,
            })
          ) {
            setPendingDelete(null)
          }
        },
      },
      state: {
        deleteConfirmationInputId,
        deleteConfirmationValue,
        isDeleteConfirming,
        isTypedDeleteConfirmationMatched,
        pendingDelete,
        pendingDeleteActionLabel,
        pendingDeleteConfirmationValue: pendingDeleteConfirmationValue ?? '',
        pendingDeleteDescription,
        pendingDeleteEntryNames,
        pendingDeleteTitle,
        requiresTypedDeleteConfirmation,
      },
    },
    requestDeleteEntries,
    requestDeleteEnvironment,
    requestDeleteSelectedEntries,
  }
}

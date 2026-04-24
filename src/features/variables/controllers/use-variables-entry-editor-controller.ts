import { useMemo, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { AppLocale } from '#/messages'
import type { EditorTab, SettingsScope } from '#/lib/variables-route-search'
import {
  saveBulkEntriesForScope,
  saveEntryForScope,
} from '#/features/variables/domain/variables-actions'
import { tryRefreshDataAfterMutation } from './variables-mutation-refresh'
import { upsertEntryInScopeStore } from '#/features/variables/domain/variables-scope-strategies'
import {
  formatMessage,
  getBulkPreviewSummary,
  getCountLabel,
  getEditorTabState,
  getScopeConfig,
  getSingleEntryFormLabels,
  getTargetLabel,
  isEnvironmentScope,
  isSecretScope,
  parseBulkVariables,
} from '#/features/variables/models/variables-helpers'
import type { VariablesStore } from '#/features/variables/state/variables-store'
import type {
  SettingsEntry,
  VariablesMessages,
} from '#/features/variables/domain/variables-types'

type StoreControls = Pick<
  VariablesStore,
  | 'closeEntryEditorImmediately'
  | 'resetRepositoryScopedData'
  | 'setBulkInput'
  | 'setBulkInputError'
  | 'setEnvironmentSecrets'
  | 'setEnvironmentSecretsKey'
  | 'setEnvironmentSelectionError'
  | 'setEnvironmentVariables'
  | 'setEnvironmentVariablesKey'
  | 'setIsBulkSaving'
  | 'setIsSaving'
  | 'setName'
  | 'setNameError'
  | 'setRepositoryError'
  | 'setRepositorySecrets'
  | 'setRepositorySecretsRepository'
  | 'setRepositoryVariables'
  | 'setRepositoryVariablesRepository'
  | 'setValue'
  | 'setValueError'
>

type EntryEditorContext = {
  activeTab: EditorTab
  currentEntries: SettingsEntry[]
  editingEntryName: string | null
  entryEditorEnvironment: string
  entryEditorRepository: string
  entryEditorScope: SettingsScope
  hasLoadedCurrentEntries: boolean
  locale: AppLocale
}

type EntryEditorDraft = {
  bulkInput: string
  name: string
  value: string
}

type EntryEditorDependencies = {
  refreshCurrentEntries: (options?: { forceRefresh?: boolean }) => Promise<void>
  refreshPageData: (options?: { forceRefresh?: boolean }) => Promise<void>
  resetGlobalSearchData: () => void
  store: StoreControls
  variablesMessages: VariablesMessages
}

export function useVariablesEntryEditorController({
  context: {
    activeTab,
    currentEntries,
    editingEntryName,
    entryEditorEnvironment,
    entryEditorRepository,
    entryEditorScope,
    hasLoadedCurrentEntries,
    locale,
  },
  draft: { bulkInput, name, value },
  dependencies: {
    refreshCurrentEntries,
    refreshPageData,
    resetGlobalSearchData,
    store,
    variablesMessages,
  },
}: {
  context: EntryEditorContext
  dependencies: EntryEditorDependencies
  draft: EntryEditorDraft
}) {
  const entryEditorScopeConfig = getScopeConfig(
    variablesMessages,
    entryEditorScope,
  )
  const parsedBulk = useMemo(
    () => parseBulkVariables(bulkInput, variablesMessages),
    [bulkInput, variablesMessages],
  )
  const parsedBulkErrors = useMemo(() => {
    if (!isSecretScope(entryEditorScope)) {
      return parsedBulk.errors
    }

    return [
      ...parsedBulk.errors,
      ...parsedBulk.entries
        .filter((entry) => !entry.value)
        .map((entry) =>
          formatMessage(variablesMessages.validation.bulkSecretValueRequired, {
            line: entry.line,
            name: entry.name,
          }),
        ),
    ]
  }, [entryEditorScope, parsedBulk, variablesMessages])
  const currentEntryNameSet = useMemo(
    () => new Set(currentEntries.map((entry) => entry.name)),
    [currentEntries],
  )
  const bulkExistingEntryCount = useMemo(
    () =>
      parsedBulk.entries.filter((entry) => currentEntryNameSet.has(entry.name))
        .length,
    [currentEntryNameSet, parsedBulk.entries],
  )
  const bulkNewEntryCount = parsedBulk.entries.length - bulkExistingEntryCount
  const { isBulkEditorActive, isSingleEntryEditor } = getEditorTabState({
    activeTab,
    editingEntryName,
  })
  const { entryEditorTitle, entryNameLabel, entryValueLabel } =
    getSingleEntryFormLabels({
      entryEditorScope,
      entryEditorScopeConfig,
      locale,
      variablesMessages,
    })
  const { duplicateSummary, previewSummary } = getBulkPreviewSummary({
    entryEditorScopeConfig,
    parsedBulk,
    variablesMessages,
  })
  const entryEditorDescription = isSingleEntryEditor
    ? formatMessage(entryEditorScopeConfig.editingDescription, {
        name: editingEntryName ?? '',
      })
    : entryEditorScopeConfig.editorDescription
  const saveActionLabel = editingEntryName
    ? variablesMessages.actions.update
    : variablesMessages.actions.add
  const bulkActionTemplate = !hasLoadedCurrentEntries
    ? variablesMessages.actions.upsertBulk
    : bulkExistingEntryCount === 0
      ? variablesMessages.actions.createBulk
      : bulkNewEntryCount === 0
        ? variablesMessages.actions.updateBulk
        : variablesMessages.actions.upsertBulk
  const bulkApplyLabel = formatMessage(bulkActionTemplate, {
    count: parsedBulk.entries.length,
    entries: getCountLabel(
      parsedBulk.entries.length,
      entryEditorScopeConfig.entryLabel,
      entryEditorScopeConfig.entryPluralLabel,
    ),
  })
  const canMutateEntryEditorScope =
    Boolean(entryEditorRepository) &&
    (!isEnvironmentScope(entryEditorScope) || Boolean(entryEditorEnvironment))
  const entryEditorNeedsEnvironmentSelection =
    isEnvironmentScope(entryEditorScope) && !entryEditorEnvironment

  function handleNameChange(nextValue: string) {
    store.setNameError(null)
    store.setName(nextValue)
  }

  function handleValueChange(nextValue: string) {
    store.setValueError(null)
    store.setValue(nextValue)
  }

  function handleBulkInputChange(nextValue: string) {
    store.setBulkInputError(null)
    store.setBulkInput(nextValue)
  }

  async function handleSaveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    store.setRepositoryError(null)
    store.setEnvironmentSelectionError(null)
    store.setNameError(null)
    store.setValueError(null)

    if (!entryEditorRepository) {
      store.setRepositoryError(
        formatMessage(
          variablesMessages.validation.selectRepositoryBeforeSaving,
          {
            entry: entryEditorScopeConfig.entryLabel,
          },
        ),
      )
      return
    }

    if (isEnvironmentScope(entryEditorScope) && !entryEditorEnvironment) {
      store.setEnvironmentSelectionError(
        variablesMessages.validation.selectEnvironmentBeforeSaving,
      )
      return
    }

    if (!name.trim()) {
      store.setNameError(
        formatMessage(variablesMessages.validation.entryNameRequired, {
          entryTitle: entryEditorScopeConfig.entryTitle,
        }),
      )
      return
    }

    if (isSecretScope(entryEditorScope) && !value.trim()) {
      store.setValueError(variablesMessages.validation.secretValueRequired)
      return
    }

    store.setIsSaving(true)

    try {
      const result = await saveEntryForScope({
        environmentName: entryEditorEnvironment,
        name: name.trim(),
        repository: entryEditorRepository,
        scope: entryEditorScope,
        value,
      })

      upsertEntryInScopeStore({
        entry: result.entry,
        environmentName: entryEditorEnvironment,
        repository: entryEditorRepository,
        scope: entryEditorScope,
        store,
      })
      resetGlobalSearchData()
      store.closeEntryEditorImmediately()
      await tryRefreshDataAfterMutation({
        refreshCurrentEntries,
        refreshPageData,
        scope: entryEditorScope,
      })

      toast.success(
        formatMessage(
          result.created
            ? variablesMessages.feedback.created
            : variablesMessages.feedback.updated,
          {
            entryTitle: entryEditorScopeConfig.entryTitle,
          },
        ),
        {
          description: formatMessage(
            isSecretScope(entryEditorScope)
              ? variablesMessages.feedback.metadataAvailableInTarget
              : variablesMessages.feedback.savedInTarget,
            {
              name: result.entry.name,
              target: getTargetLabel(
                entryEditorRepository,
                entryEditorEnvironment,
                entryEditorScope,
              ),
            },
          ),
        },
      )
    } catch (error) {
      toast.error(
        formatMessage(variablesMessages.errors.saveFailed, {
          entry: entryEditorScopeConfig.entryLabel,
        }),
        {
          description:
            error instanceof Error
              ? error.message
              : formatMessage(variablesMessages.errors.saveFailed, {
                  entry: entryEditorScopeConfig.entryLabel,
                }),
        },
      )
    } finally {
      store.setIsSaving(false)
    }
  }

  async function handleApplyBulkEntries() {
    store.setRepositoryError(null)
    store.setEnvironmentSelectionError(null)
    store.setBulkInputError(null)

    if (!entryEditorRepository) {
      store.setRepositoryError(
        formatMessage(variablesMessages.validation.selectRepositoryBeforeBulk, {
          entry: entryEditorScopeConfig.entryLabel,
        }),
      )
      return
    }

    if (isEnvironmentScope(entryEditorScope) && !entryEditorEnvironment) {
      store.setEnvironmentSelectionError(
        variablesMessages.validation.selectEnvironmentBeforeApplying,
      )
      return
    }

    if (!bulkInput.trim()) {
      store.setBulkInputError(variablesMessages.validation.bulkInputRequired)
      return
    }

    if (parsedBulkErrors.length > 0) {
      store.setBulkInputError(variablesMessages.validation.invalidLines)
      return
    }

    store.setIsBulkSaving(true)

    try {
      const appliedCount = await saveBulkEntriesForScope({
        entries: parsedBulk.entries,
        environmentName: entryEditorEnvironment,
        repository: entryEditorRepository,
        scope: entryEditorScope,
      })

      await tryRefreshDataAfterMutation({
        refreshCurrentEntries,
        refreshPageData,
        scope: entryEditorScope,
      })
      resetGlobalSearchData()
      store.closeEntryEditorImmediately()

      toast.success(variablesMessages.feedback.bulkComplete, {
        description: formatMessage(
          variablesMessages.feedback.bulkCompleteDescription,
          {
            count: appliedCount,
            entries: getCountLabel(
              appliedCount,
              entryEditorScopeConfig.entryLabel,
              entryEditorScopeConfig.entryPluralLabel,
            ),
            target: getTargetLabel(
              entryEditorRepository,
              entryEditorEnvironment,
              entryEditorScope,
            ),
          },
        ),
      })
    } catch (error) {
      await tryRefreshDataAfterMutation({
        refreshCurrentEntries,
        refreshPageData,
        scope: entryEditorScope,
      })
      resetGlobalSearchData()

      toast.error(variablesMessages.feedback.bulkStopped, {
        description:
          error instanceof Error
            ? `${variablesMessages.feedback.bulkStoppedDescription} ${error.message}`
            : variablesMessages.feedback.bulkStoppedDescription,
      })
    } finally {
      store.setIsBulkSaving(false)
    }
  }

  return {
    bulkApplyLabel,
    canMutateEntryEditorScope,
    duplicateSummary,
    entryEditorDescription,
    entryEditorNeedsEnvironmentSelection,
    entryEditorScopeConfig,
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
  }
}

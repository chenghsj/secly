import type { SettingsScope } from '#/lib/variables-route-search'
import type { VariablesStore } from '#/features/variables/state/variables-store'
import type { SettingsEntry } from './variables-types'

export function startCreateEntryEditor(
  store: Pick<
    VariablesStore,
    | 'clearEntryEditorDrafts'
    | 'setEntryEditorContext'
    | 'setIsEntryEditorOpen'
    | 'setIsGlobalSearchDialogOpen'
    | 'setShouldRestoreGlobalSearchAfterEditorClose'
  >,
  context: {
    activeScope: SettingsScope
    selectedEnvironment: string
    selectedRepository: string
  },
) {
  store.clearEntryEditorDrafts()
  store.setEntryEditorContext({
    environmentName: context.selectedEnvironment,
    repository: context.selectedRepository,
    scope: context.activeScope,
  })
  store.setShouldRestoreGlobalSearchAfterEditorClose(false)
  store.setIsGlobalSearchDialogOpen(false)
  store.setIsEntryEditorOpen(true)
}

export function openEntryEditorForScope(
  store: Pick<
    VariablesStore,
    | 'clearEntryEditorDrafts'
    | 'setEditingEntryName'
    | 'setEntryEditorContext'
    | 'setIsEntryEditorOpen'
    | 'setIsGlobalSearchDialogOpen'
    | 'setName'
    | 'setShouldRestoreGlobalSearchAfterEditorClose'
    | 'setValue'
  >,
  params: {
    activeScope: SettingsScope
    entry: SettingsEntry
    isGlobalSearchDialogOpen: boolean
    scope: SettingsScope
    selectedEnvironment: string
    selectedRepository: string
  },
) {
  const isCurrentScope = params.scope === params.activeScope

  store.clearEntryEditorDrafts()
  store.setEntryEditorContext({
    environmentName: isCurrentScope ? params.selectedEnvironment : '',
    repository: isCurrentScope ? params.selectedRepository : '',
    scope: params.scope,
  })
  store.setEditingEntryName(params.entry.name)
  store.setName(params.entry.name)
  store.setValue(params.entry.value ?? '')
  store.setShouldRestoreGlobalSearchAfterEditorClose(
    params.isGlobalSearchDialogOpen,
  )
  store.setIsGlobalSearchDialogOpen(false)
  store.setIsEntryEditorOpen(true)
}

export function requestCloseEntryEditor(
  store: Pick<
    VariablesStore,
    'closeEntryEditorImmediately' | 'setIsGlobalSearchDialogOpen'
  >,
  params: {
    isEntryEditorOpen: boolean
    shouldRestoreGlobalSearchAfterEditorClose: boolean
    trimmedGlobalSearchQuery: string
  },
) {
  if (!params.isEntryEditorOpen) {
    return
  }

  const shouldRestoreGlobalSearch =
    params.shouldRestoreGlobalSearchAfterEditorClose &&
    Boolean(params.trimmedGlobalSearchQuery)

  store.closeEntryEditorImmediately()

  if (shouldRestoreGlobalSearch) {
    store.setIsGlobalSearchDialogOpen(true)
  }
}

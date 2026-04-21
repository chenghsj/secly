import type { VariablesStore } from './variables-store'
import type { GlobalSearchResult } from './variables-types'

export function openGlobalSearchResultInEditor(
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
  result: GlobalSearchResult,
) {
  store.clearEntryEditorDrafts()
  store.setEntryEditorContext({
    environmentName: result.environmentName ?? '',
    repository: result.repository,
    scope: result.scope,
  })
  store.setEditingEntryName(result.name)
  store.setName(result.name)
  store.setValue(result.value ?? '')
  store.setShouldRestoreGlobalSearchAfterEditorClose(true)
  store.setIsGlobalSearchDialogOpen(false)
  store.setIsEntryEditorOpen(true)
}

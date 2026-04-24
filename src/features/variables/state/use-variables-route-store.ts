import { useShallow } from 'zustand/react/shallow'
import type { VariablesStore } from './variables-store'
import { useVariablesStore } from './variables-store'

function selectVariablesRouteResourceState(state: VariablesStore) {
  return {
    environmentSecrets: state.environmentSecrets,
    environmentSecretsKey: state.environmentSecretsKey,
    environmentVariables: state.environmentVariables,
    environmentVariablesKey: state.environmentVariablesKey,
    environments: state.environments,
    environmentsRepository: state.environmentsRepository,
    repositories: state.repositories,
    repositorySecrets: state.repositorySecrets,
    repositorySecretsRepository: state.repositorySecretsRepository,
    repositoryVariables: state.repositoryVariables,
    repositoryVariablesRepository: state.repositoryVariablesRepository,
  }
}

function selectVariablesRouteEditorState(state: VariablesStore) {
  return {
    bulkInput: state.bulkInput,
    bulkInputError: state.bulkInputError,
    editingEntryName: state.editingEntryName,
    entryEditorContext: state.entryEditorContext,
    environmentName: state.environmentName,
    environmentNameError: state.environmentNameError,
    isBulkSaving: state.isBulkSaving,
    isCreatingEnvironment: state.isCreatingEnvironment,
    isEntryEditorOpen: state.isEntryEditorOpen,
    isEnvironmentCreateOpen: state.isEnvironmentCreateOpen,
    isSaving: state.isSaving,
    name: state.name,
    nameError: state.nameError,
    shouldRestoreGlobalSearchAfterEditorClose:
      state.shouldRestoreGlobalSearchAfterEditorClose,
    value: state.value,
    valueError: state.valueError,
  }
}

function selectVariablesRouteUiState(state: VariablesStore) {
  return {
    deleteConfirmationValue: state.deleteConfirmationValue,
    environmentSelectionError: state.environmentSelectionError,
    globalSearchError: state.globalSearchError,
    globalSearchQuery: state.globalSearchQuery,
    globalSearchRepository: state.globalSearchRepository,
    globalSearchResults: state.globalSearchResults,
    isDeletingEntries: state.isDeletingEntries,
    isDeletingEnvironment: state.isDeletingEnvironment,
    isEnvironmentEditing: state.isEnvironmentEditing,
    isGlobalSearchDialogOpen: state.isGlobalSearchDialogOpen,
    isGlobalSearchLoading: state.isGlobalSearchLoading,
    isRefreshingEntries: state.isRefreshingEntries,
    isRefreshingEnvironments: state.isRefreshingEnvironments,
    isRefreshingRepositories: state.isRefreshingRepositories,
    isTableEditing: state.isTableEditing,
    pendingDelete: state.pendingDelete,
    repositoryError: state.repositoryError,
    selectedEntryNames: state.selectedEntryNames,
  }
}

function selectVariablesRouteResourceActions(state: VariablesStore) {
  return {
    setEnvironments: state.setEnvironments,
    setEnvironmentsRepository: state.setEnvironmentsRepository,
    setEnvironmentSecrets: state.setEnvironmentSecrets,
    setEnvironmentSecretsKey: state.setEnvironmentSecretsKey,
    setEnvironmentVariables: state.setEnvironmentVariables,
    setEnvironmentVariablesKey: state.setEnvironmentVariablesKey,
    setRepositories: state.setRepositories,
    setRepositorySecrets: state.setRepositorySecrets,
    setRepositorySecretsRepository: state.setRepositorySecretsRepository,
    setRepositoryVariables: state.setRepositoryVariables,
    setRepositoryVariablesRepository: state.setRepositoryVariablesRepository,
  }
}

function selectVariablesRouteEditorActions(state: VariablesStore) {
  return {
    clearEntryEditorDrafts: state.clearEntryEditorDrafts,
    closeEntryEditorImmediately: state.closeEntryEditorImmediately,
    closeEnvironmentCreateImmediately: state.closeEnvironmentCreateImmediately,
    setBulkInput: state.setBulkInput,
    setBulkInputError: state.setBulkInputError,
    setEditingEntryName: state.setEditingEntryName,
    setEnvironmentName: state.setEnvironmentName,
    setEnvironmentNameError: state.setEnvironmentNameError,
    setEntryEditorContext: state.setEntryEditorContext,
    setIsBulkSaving: state.setIsBulkSaving,
    setIsCreatingEnvironment: state.setIsCreatingEnvironment,
    setIsEntryEditorOpen: state.setIsEntryEditorOpen,
    setIsEnvironmentCreateOpen: state.setIsEnvironmentCreateOpen,
    setIsSaving: state.setIsSaving,
    setName: state.setName,
    setNameError: state.setNameError,
    setShouldRestoreGlobalSearchAfterEditorClose:
      state.setShouldRestoreGlobalSearchAfterEditorClose,
    setValue: state.setValue,
    setValueError: state.setValueError,
  }
}

function selectVariablesRouteUiActions(state: VariablesStore) {
  return {
    clearEnvironmentEditing: state.clearEnvironmentEditing,
    clearGlobalSearchData: state.clearGlobalSearchData,
    clearTableEditing: state.clearTableEditing,
    setDeleteConfirmationValue: state.setDeleteConfirmationValue,
    setEnvironmentSelectionError: state.setEnvironmentSelectionError,
    setGlobalSearchError: state.setGlobalSearchError,
    setGlobalSearchQuery: state.setGlobalSearchQuery,
    setGlobalSearchRepository: state.setGlobalSearchRepository,
    setGlobalSearchResults: state.setGlobalSearchResults,
    setIsDeletingEntries: state.setIsDeletingEntries,
    setIsDeletingEnvironment: state.setIsDeletingEnvironment,
    setIsEnvironmentEditing: state.setIsEnvironmentEditing,
    setIsGlobalSearchDialogOpen: state.setIsGlobalSearchDialogOpen,
    setIsGlobalSearchLoading: state.setIsGlobalSearchLoading,
    setIsRefreshingEntries: state.setIsRefreshingEntries,
    setIsRefreshingEnvironments: state.setIsRefreshingEnvironments,
    setIsRefreshingRepositories: state.setIsRefreshingRepositories,
    setIsTableEditing: state.setIsTableEditing,
    setPendingDelete: state.setPendingDelete,
    setRepositoryError: state.setRepositoryError,
    setSelectedEntryNames: state.setSelectedEntryNames,
    toggleEntrySelection: state.toggleEntrySelection,
  }
}

export function useVariablesRouteStore() {
  const resourceState = useVariablesStore(
    useShallow(selectVariablesRouteResourceState),
  )
  const editorState = useVariablesStore(
    useShallow(selectVariablesRouteEditorState),
  )
  const uiState = useVariablesStore(useShallow(selectVariablesRouteUiState))
  const resourceActions = useVariablesStore(
    useShallow(selectVariablesRouteResourceActions),
  )
  const editorActions = useVariablesStore(
    useShallow(selectVariablesRouteEditorActions),
  )
  const uiActions = useVariablesStore(useShallow(selectVariablesRouteUiActions))
  const resetRepositoryScopedData = useVariablesStore(
    (state) => state.resetRepositoryScopedData,
  )

  return {
    editorActions,
    editorState,
    resetRepositoryScopedData,
    resourceActions,
    resourceState,
    uiActions,
    uiState,
  }
}

import type { SetStateAction } from 'react'
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
  EntryEditorContext,
  GlobalSearchResult,
  PendingDeleteState,
  VariablesLoaderData,
  VariablesPageDataSnapshot,
} from '#/features/variables/domain/variables-types'

export type VariablesResourceState = {
  repositories: GhRepositorySummary[]
  repositoryVariables: GhRepositoryVariable[]
  repositoryVariablesRepository: string
  repositorySecrets: GhActionsSecret[]
  repositorySecretsRepository: string
  environments: GhEnvironmentSummary[]
  environmentsRepository: string
  environmentVariables: GhActionsVariable[]
  environmentVariablesKey: string
  environmentSecrets: GhActionsSecret[]
  environmentSecretsKey: string
}

export type VariablesEditorState = {
  name: string
  value: string
  bulkInput: string
  editingEntryName: string | null
  environmentName: string
  isEntryEditorOpen: boolean
  isEnvironmentCreateOpen: boolean
  isSaving: boolean
  isBulkSaving: boolean
  isCreatingEnvironment: boolean
  entryEditorContext: EntryEditorContext | null
  shouldRestoreGlobalSearchAfterEditorClose: boolean
  nameError: string | null
  valueError: string | null
  bulkInputError: string | null
  environmentNameError: string | null
}

export type VariablesUiState = {
  isEnvironmentEditing: boolean
  isTableEditing: boolean
  selectedEntryNames: string[]
  isRefreshingRepositories: boolean
  isRefreshingEntries: boolean
  isRefreshingEnvironments: boolean
  isDeletingEnvironment: boolean
  isDeletingEntries: boolean
  pendingDelete: PendingDeleteState | null
  deleteConfirmationValue: string
  repositoryError: string | null
  environmentSelectionError: string | null
  globalSearchError: string | null
  globalSearchRepository: string
  globalSearchResults: GlobalSearchResult[]
  globalSearchQuery: string
  isGlobalSearchLoading: boolean
  isGlobalSearchDialogOpen: boolean
}

export type VariablesStoreSettableState = VariablesResourceState &
  VariablesEditorState &
  VariablesUiState

export type VariablesResourceActions = {
  setRepositories: (value: SetStateAction<GhRepositorySummary[]>) => void
  setRepositoryVariables: (
    value: SetStateAction<GhRepositoryVariable[]>,
  ) => void
  setRepositoryVariablesRepository: (value: SetStateAction<string>) => void
  setRepositorySecrets: (value: SetStateAction<GhActionsSecret[]>) => void
  setRepositorySecretsRepository: (value: SetStateAction<string>) => void
  setEnvironments: (value: SetStateAction<GhEnvironmentSummary[]>) => void
  setEnvironmentsRepository: (value: SetStateAction<string>) => void
  setEnvironmentVariables: (value: SetStateAction<GhActionsVariable[]>) => void
  setEnvironmentVariablesKey: (value: SetStateAction<string>) => void
  setEnvironmentSecrets: (value: SetStateAction<GhActionsSecret[]>) => void
  setEnvironmentSecretsKey: (value: SetStateAction<string>) => void
  replaceLoaderData: (loaderData: VariablesLoaderData) => void
}

export type VariablesEditorActions = {
  setName: (value: SetStateAction<string>) => void
  setValue: (value: SetStateAction<string>) => void
  setBulkInput: (value: SetStateAction<string>) => void
  setEditingEntryName: (value: SetStateAction<string | null>) => void
  setEnvironmentName: (value: SetStateAction<string>) => void
  setIsEntryEditorOpen: (value: SetStateAction<boolean>) => void
  setIsEnvironmentCreateOpen: (value: SetStateAction<boolean>) => void
  setIsSaving: (value: SetStateAction<boolean>) => void
  setIsBulkSaving: (value: SetStateAction<boolean>) => void
  setIsCreatingEnvironment: (value: SetStateAction<boolean>) => void
  setEntryEditorContext: (
    value: SetStateAction<EntryEditorContext | null>,
  ) => void
  setShouldRestoreGlobalSearchAfterEditorClose: (
    value: SetStateAction<boolean>,
  ) => void
  setNameError: (value: SetStateAction<string | null>) => void
  setValueError: (value: SetStateAction<string | null>) => void
  setBulkInputError: (value: SetStateAction<string | null>) => void
  setEnvironmentNameError: (value: SetStateAction<string | null>) => void
  resetSingleEditor: () => void
  clearEntryEditorDrafts: () => void
  closeEntryEditorImmediately: () => void
  closeEnvironmentCreateImmediately: () => void
}

export type VariablesUiActions = {
  setIsEnvironmentEditing: (value: SetStateAction<boolean>) => void
  setIsTableEditing: (value: SetStateAction<boolean>) => void
  setSelectedEntryNames: (value: SetStateAction<string[]>) => void
  setIsRefreshingRepositories: (value: SetStateAction<boolean>) => void
  setIsRefreshingEntries: (value: SetStateAction<boolean>) => void
  setIsRefreshingEnvironments: (value: SetStateAction<boolean>) => void
  setIsDeletingEnvironment: (value: SetStateAction<boolean>) => void
  setIsDeletingEntries: (value: SetStateAction<boolean>) => void
  setPendingDelete: (value: SetStateAction<PendingDeleteState | null>) => void
  setDeleteConfirmationValue: (value: SetStateAction<string>) => void
  setRepositoryError: (value: SetStateAction<string | null>) => void
  setEnvironmentSelectionError: (value: SetStateAction<string | null>) => void
  setGlobalSearchError: (value: SetStateAction<string | null>) => void
  setGlobalSearchRepository: (value: SetStateAction<string>) => void
  setGlobalSearchResults: (value: SetStateAction<GlobalSearchResult[]>) => void
  setGlobalSearchQuery: (value: SetStateAction<string>) => void
  setIsGlobalSearchLoading: (value: SetStateAction<boolean>) => void
  setIsGlobalSearchDialogOpen: (value: SetStateAction<boolean>) => void
  clearGlobalSearchData: () => void
  clearTableEditing: () => void
  clearEnvironmentEditing: () => void
  toggleEntrySelection: (entryName: string) => void
}

export type VariablesStoreActions = VariablesResourceActions &
  VariablesEditorActions &
  VariablesUiActions & {
    resetRepositoryScopedData: () => void
  }

export type VariablesStoreState = VariablesStoreSettableState
export type VariablesStore = VariablesStoreState & VariablesStoreActions

type VariablesStoreSetter = (
  updater: (state: VariablesStore) => Partial<VariablesStore>,
) => void

type VariablesStoreGetter = () => VariablesStore

function resolveStateAction<T>(value: SetStateAction<T>, currentValue: T) {
  return typeof value === 'function'
    ? (value as (currentValue: T) => T)(currentValue)
    : value
}

export function setStoreField<Key extends keyof VariablesStoreState>(
  set: VariablesStoreSetter,
  key: Key,
  value: SetStateAction<VariablesStoreState[Key]>,
) {
  set((state) => ({
    [key]: resolveStateAction(value, state[key]),
  }))
}

export function createVariablesResourceState({
  initialDataSnapshot,
  loaderData,
}: {
  initialDataSnapshot: VariablesPageDataSnapshot | null
  loaderData: VariablesLoaderData
}): VariablesResourceState {
  return {
    repositories: initialDataSnapshot?.repositories ?? loaderData.repositories,
    repositoryVariables:
      initialDataSnapshot?.repositoryVariables ??
      loaderData.repositoryVariables,
    repositoryVariablesRepository:
      initialDataSnapshot?.repositoryVariablesRepository ??
      loaderData.repositoryVariablesRepository,
    repositorySecrets:
      initialDataSnapshot?.repositorySecrets ?? loaderData.repositorySecrets,
    repositorySecretsRepository:
      initialDataSnapshot?.repositorySecretsRepository ??
      loaderData.repositorySecretsRepository,
    environments: initialDataSnapshot?.environments ?? loaderData.environments,
    environmentsRepository:
      initialDataSnapshot?.environmentsRepository ??
      loaderData.environmentsRepository,
    environmentVariables:
      initialDataSnapshot?.environmentVariables ??
      loaderData.environmentVariables,
    environmentVariablesKey:
      initialDataSnapshot?.environmentVariablesKey ??
      loaderData.environmentVariablesKey,
    environmentSecrets:
      initialDataSnapshot?.environmentSecrets ?? loaderData.environmentSecrets,
    environmentSecretsKey:
      initialDataSnapshot?.environmentSecretsKey ??
      loaderData.environmentSecretsKey,
  }
}

export function createVariablesEditorState(): VariablesEditorState {
  return {
    name: '',
    value: '',
    bulkInput: '',
    editingEntryName: null,
    environmentName: '',
    isEntryEditorOpen: false,
    isEnvironmentCreateOpen: false,
    isSaving: false,
    isBulkSaving: false,
    isCreatingEnvironment: false,
    entryEditorContext: null,
    shouldRestoreGlobalSearchAfterEditorClose: false,
    nameError: null,
    valueError: null,
    bulkInputError: null,
    environmentNameError: null,
  }
}

export function createVariablesUiState(): VariablesUiState {
  return {
    isEnvironmentEditing: false,
    isTableEditing: false,
    selectedEntryNames: [],
    isRefreshingRepositories: false,
    isRefreshingEntries: false,
    isRefreshingEnvironments: false,
    isDeletingEnvironment: false,
    isDeletingEntries: false,
    pendingDelete: null,
    deleteConfirmationValue: '',
    repositoryError: null,
    environmentSelectionError: null,
    globalSearchError: null,
    globalSearchRepository: '',
    globalSearchResults: [],
    globalSearchQuery: '',
    isGlobalSearchLoading: false,
    isGlobalSearchDialogOpen: false,
  }
}

export function createVariablesResourceActions(
  set: VariablesStoreSetter,
): VariablesResourceActions {
  return {
    setRepositories: (value) => setStoreField(set, 'repositories', value),
    setRepositoryVariables: (value) =>
      setStoreField(set, 'repositoryVariables', value),
    setRepositoryVariablesRepository: (value) =>
      setStoreField(set, 'repositoryVariablesRepository', value),
    setRepositorySecrets: (value) =>
      setStoreField(set, 'repositorySecrets', value),
    setRepositorySecretsRepository: (value) =>
      setStoreField(set, 'repositorySecretsRepository', value),
    setEnvironments: (value) => setStoreField(set, 'environments', value),
    setEnvironmentsRepository: (value) =>
      setStoreField(set, 'environmentsRepository', value),
    setEnvironmentVariables: (value) =>
      setStoreField(set, 'environmentVariables', value),
    setEnvironmentVariablesKey: (value) =>
      setStoreField(set, 'environmentVariablesKey', value),
    setEnvironmentSecrets: (value) =>
      setStoreField(set, 'environmentSecrets', value),
    setEnvironmentSecretsKey: (value) =>
      setStoreField(set, 'environmentSecretsKey', value),
    replaceLoaderData: (loaderData) =>
      set(() => ({
        repositories: loaderData.repositories,
        repositoryVariables: loaderData.repositoryVariables,
        repositoryVariablesRepository: loaderData.repositoryVariablesRepository,
        repositorySecrets: loaderData.repositorySecrets,
        repositorySecretsRepository: loaderData.repositorySecretsRepository,
        environments: loaderData.environments,
        environmentsRepository: loaderData.environmentsRepository,
        environmentVariables: loaderData.environmentVariables,
        environmentVariablesKey: loaderData.environmentVariablesKey,
        environmentSecrets: loaderData.environmentSecrets,
        environmentSecretsKey: loaderData.environmentSecretsKey,
      })),
  }
}

export function createVariablesEditorActions(
  set: VariablesStoreSetter,
  get: VariablesStoreGetter,
): VariablesEditorActions {
  return {
    setName: (value) => setStoreField(set, 'name', value),
    setValue: (value) => setStoreField(set, 'value', value),
    setBulkInput: (value) => setStoreField(set, 'bulkInput', value),
    setEditingEntryName: (value) =>
      setStoreField(set, 'editingEntryName', value),
    setEnvironmentName: (value) => setStoreField(set, 'environmentName', value),
    setIsEntryEditorOpen: (value) =>
      setStoreField(set, 'isEntryEditorOpen', value),
    setIsEnvironmentCreateOpen: (value) =>
      setStoreField(set, 'isEnvironmentCreateOpen', value),
    setIsSaving: (value) => setStoreField(set, 'isSaving', value),
    setIsBulkSaving: (value) => setStoreField(set, 'isBulkSaving', value),
    setIsCreatingEnvironment: (value) =>
      setStoreField(set, 'isCreatingEnvironment', value),
    setEntryEditorContext: (value) =>
      setStoreField(set, 'entryEditorContext', value),
    setShouldRestoreGlobalSearchAfterEditorClose: (value) =>
      setStoreField(set, 'shouldRestoreGlobalSearchAfterEditorClose', value),
    setNameError: (value) => setStoreField(set, 'nameError', value),
    setValueError: (value) => setStoreField(set, 'valueError', value),
    setBulkInputError: (value) => setStoreField(set, 'bulkInputError', value),
    setEnvironmentNameError: (value) =>
      setStoreField(set, 'environmentNameError', value),
    resetSingleEditor: () =>
      set(() => ({
        editingEntryName: null,
        name: '',
        nameError: null,
        value: '',
        valueError: null,
      })),
    clearEntryEditorDrafts: () => {
      get().resetSingleEditor()
      set(() => ({
        bulkInput: '',
        bulkInputError: null,
      }))
    },
    closeEntryEditorImmediately: () => {
      get().clearEntryEditorDrafts()
      set(() => ({
        entryEditorContext: null,
        isEntryEditorOpen: false,
        shouldRestoreGlobalSearchAfterEditorClose: false,
      }))
    },
    closeEnvironmentCreateImmediately: () =>
      set(() => ({
        environmentName: '',
        environmentNameError: null,
        isEnvironmentCreateOpen: false,
      })),
  }
}

export function createVariablesUiActions(
  set: VariablesStoreSetter,
): VariablesUiActions {
  return {
    setIsEnvironmentEditing: (value) =>
      setStoreField(set, 'isEnvironmentEditing', value),
    setIsTableEditing: (value) => setStoreField(set, 'isTableEditing', value),
    setSelectedEntryNames: (value) =>
      setStoreField(set, 'selectedEntryNames', value),
    setIsRefreshingRepositories: (value) =>
      setStoreField(set, 'isRefreshingRepositories', value),
    setIsRefreshingEntries: (value) =>
      setStoreField(set, 'isRefreshingEntries', value),
    setIsRefreshingEnvironments: (value) =>
      setStoreField(set, 'isRefreshingEnvironments', value),
    setIsDeletingEnvironment: (value) =>
      setStoreField(set, 'isDeletingEnvironment', value),
    setIsDeletingEntries: (value) =>
      setStoreField(set, 'isDeletingEntries', value),
    setPendingDelete: (value) => setStoreField(set, 'pendingDelete', value),
    setDeleteConfirmationValue: (value) =>
      setStoreField(set, 'deleteConfirmationValue', value),
    setRepositoryError: (value) => setStoreField(set, 'repositoryError', value),
    setEnvironmentSelectionError: (value) =>
      setStoreField(set, 'environmentSelectionError', value),
    setGlobalSearchError: (value) =>
      setStoreField(set, 'globalSearchError', value),
    setGlobalSearchRepository: (value) =>
      setStoreField(set, 'globalSearchRepository', value),
    setGlobalSearchResults: (value) =>
      setStoreField(set, 'globalSearchResults', value),
    setGlobalSearchQuery: (value) =>
      setStoreField(set, 'globalSearchQuery', value),
    setIsGlobalSearchLoading: (value) =>
      setStoreField(set, 'isGlobalSearchLoading', value),
    setIsGlobalSearchDialogOpen: (value) =>
      setStoreField(set, 'isGlobalSearchDialogOpen', value),
    clearGlobalSearchData: () =>
      set(() => ({
        globalSearchError: null,
        globalSearchRepository: '',
        globalSearchResults: [],
        isGlobalSearchLoading: false,
      })),
    clearTableEditing: () =>
      set(() => ({
        isTableEditing: false,
        selectedEntryNames: [],
      })),
    clearEnvironmentEditing: () =>
      set(() => ({
        isEnvironmentEditing: false,
      })),
    toggleEntrySelection: (entryName) =>
      set((state) => ({
        selectedEntryNames: state.selectedEntryNames.includes(entryName)
          ? state.selectedEntryNames.filter(
              (selectedName) => selectedName !== entryName,
            )
          : [...state.selectedEntryNames, entryName],
      })),
  }
}

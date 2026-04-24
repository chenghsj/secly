// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesRouteScreenContainer } from './variables-route-screen-container'

const { useVariablesRouteFocusManagementMock } = vi.hoisted(() => ({
  useVariablesRouteFocusManagementMock: vi.fn(),
}))

vi.mock(
  '#/features/variables/controllers/use-variables-route-focus-management',
  () => ({
    useVariablesRouteFocusManagement: useVariablesRouteFocusManagementMock,
  }),
)

vi.mock('./variables-route-screen', () => ({
  VariablesRouteScreen: ({
    deleteDialog,
    entriesPanel,
    entryEditorDialog,
    environmentCreateDialog,
    globalSearchDialog,
    targetPanel,
  }: {
    deleteDialog: React.ReactNode
    entriesPanel: React.ReactNode
    entryEditorDialog: React.ReactNode
    environmentCreateDialog: React.ReactNode
    globalSearchDialog: React.ReactNode
    targetPanel: React.ReactNode
  }) => (
    <div>
      {targetPanel}
      {entriesPanel}
      {globalSearchDialog}
      {environmentCreateDialog}
      {entryEditorDialog}
      {deleteDialog}
    </div>
  ),
}))

vi.mock('./variables-target-panel-container', () => ({
  VariablesTargetPanelContainer: () => <div>target panel container</div>,
}))

vi.mock('./variables-entries-panel-container', () => ({
  VariablesEntriesPanelContainer: () => <div>entries panel container</div>,
}))

vi.mock('./variables-global-search-dialog-container', () => ({
  VariablesGlobalSearchDialogContainer: () => (
    <div>global search dialog container</div>
  ),
}))

vi.mock('./variables-environment-create-dialog-container', () => ({
  VariablesEnvironmentCreateDialogContainer: () => (
    <div>environment create dialog container</div>
  ),
}))

vi.mock('./variables-entry-editor-dialog-container', () => ({
  VariablesEntryEditorDialogContainer: () => (
    <div>entry editor dialog container</div>
  ),
}))

vi.mock('./variables-delete-confirm-dialog-container', () => ({
  VariablesDeleteConfirmDialogContainer: () => (
    <div>delete confirm dialog container</div>
  ),
}))

describe('VariablesRouteScreenContainer', () => {
  it('composes the extracted block and dialog containers into the route screen', () => {
    const variablesMessages = translations.en.variables

    render(
      <VariablesRouteScreenContainer
        deleteDialog={{
          actions: {
            onConfirm: vi.fn(),
            onConfirmationValueChange: vi.fn(),
            onCopyConfirmationValue: vi.fn(),
            onOpenChange: vi.fn(),
          },
          state: {
            deleteConfirmationInputId: 'delete-confirmation-input',
            deleteConfirmationValue: '',
            isDeleteConfirming: false,
            isTypedDeleteConfirmationMatched: true,
            pendingDelete: null,
            pendingDeleteActionLabel: variablesMessages.deleteDialogConfirm,
            pendingDeleteConfirmationValue: '',
            pendingDeleteDescription: '',
            pendingDeleteEntryNames: [],
            pendingDeleteTitle: '',
            requiresTypedDeleteConfirmation: false,
          },
          variablesMessages,
        }}
        entriesPanel={{
          actions: {
            onClearSearch: vi.fn(),
            onDeleteSelected: vi.fn(),
            onRequestDeleteEntry: vi.fn(),
            onSearchChange: vi.fn(),
            onSortChange: vi.fn(),
            onStartCreateEntry: vi.fn(),
            onStartEditEntry: vi.fn(),
            onToggleEntryEditing: vi.fn(),
            onToggleEntrySelection: vi.fn(),
            onToggleFilteredSelection: vi.fn(),
          },
          activeScope: 'repository-variables',
          allFilteredEntriesSelected: false,
          canMutateCurrentScope: true,
          currentEntries: [],
          entrySortDirection: 'asc',
          entrySortField: 'name',
          environments: [],
          environmentsRepository: '',
          filteredEntries: [],
          hasLoadedCurrentEntries: true,
          hasPartiallySelectedEntries: false,
          hasSelectedEntries: false,
          inputId: 'entry-search-input',
          isListActionDisabled: false,
          isListLoading: false,
          isTableEditing: false,
          listEmptyDescription: variablesMessages.noEntriesDescription,
          listEmptyTitle: variablesMessages.noEntriesTitle,
          locale: 'en',
          noMatchesTitle: variablesMessages.noMatchesTitle,
          query: '',
          scopeConfig: variablesMessages.scopes.repositoryVariables,
          selectedEntryNameSet: new Set<string>(),
          selectedEnvironment: '',
          selectedRepository: 'acme/repo',
          sortedFilteredEntries: [],
          valueColumnLabel: variablesMessages.columns.value,
          variablesMessages,
        }}
        entryEditorDialog={{
          actions: {
            onApplyBulkEntries: vi.fn(),
            onCancel: vi.fn(),
            onOpenChange: vi.fn(),
            onTabChange: vi.fn(),
          },
          activeTab: 'single',
          bulkApplyLabel: variablesMessages.actions.add,
          bulkEntryPanel: <div>bulk panel</div>,
          canMutateEntryEditorScope: true,
          entryEditorDescription: 'Edit entry',
          entryEditorNeedsEnvironmentSelection: false,
          entryEditorRepository: 'acme/repo',
          entryEditorScope: 'repository-variables',
          entryEditorTitle: 'Edit entry',
          isBulkEditorActive: false,
          isBulkSaving: false,
          isSaving: false,
          isSingleEntryEditor: true,
          open: true,
          parsedBulkEntryCount: 0,
          parsedBulkErrorCount: 0,
          saveActionLabel: variablesMessages.saveButton,
          singleEntryForm: <form aria-label="single entry form" />,
          variablesMessages,
        }}
        environmentCreateDialog={{
          actions: {
            onClose: vi.fn(),
            onEnvironmentNameChange: vi.fn(),
            onOpenChange: vi.fn(),
            onSubmit: vi.fn(),
          },
          environmentName: '',
          environmentNameError: null,
          environmentNameErrorId: 'environment-name-error',
          environmentNameInputId: 'environment-name-input',
          isCreatingEnvironment: false,
          isEnvironmentCreateOpen: false,
          selectedRepository: 'acme/repo',
          variablesMessages,
        }}
        focusManagement={{
          bulkInputId: 'bulk-input-id',
          entryEditorNeedsEnvironmentSelection: false,
          entryEditorRepository: 'acme/repo',
          entryNameInputId: 'entry-name-input',
          entryValueInputId: 'entry-value-input',
          globalSearchInputId: 'global-entry-search-input',
          isBulkEditorActive: false,
          isEntryEditorOpen: true,
          isGlobalSearchDialogOpen: false,
          isSingleEntryEditor: true,
        }}
        globalSearchDialog={{
          actions: {
            onClearSearch: vi.fn(),
            onGlobalSearchQueryChange: vi.fn(),
            onOpenChange: vi.fn(),
            onRetry: vi.fn(),
            onSaveResult: vi.fn(),
          },
          filteredResults: [],
          globalSearchError: null,
          globalSearchInputId: 'global-entry-search-input',
          globalSearchQuery: '',
          isGlobalSearchDialogOpen: false,
          isGlobalSearchLoading: false,
          locale: 'en',
          selectedRepository: 'acme/repo',
          trimmedGlobalSearchQuery: '',
          variablesMessages,
        }}
        isAuthenticated
        isGlobalSearchDialogOpen={false}
        onOpenGlobalSearch={vi.fn()}
        scopeTitle="Repository variables"
        targetPanel={{
          actions: {
            onDeleteEnvironment: vi.fn(),
            onDoneEnvironment: vi.fn(),
            onEnvironmentChange: vi.fn(),
            onOpenEnvironmentCreate: vi.fn(),
            onRefresh: vi.fn(),
            onRepositoryChange: vi.fn(),
            onScopeChange: vi.fn(),
            onScopePrefetch: vi.fn(),
            onStartEnvironmentEditing: vi.fn(),
          },
          activeScope: 'repository-variables',
          environmentSelectionError: null,
          environments: [],
          repositoryError: null,
          repositories: [],
          selectedEnvironment: '',
          selectedRepository: 'acme/repo',
          status: {
            isDeletingEnvironment: false,
            isEnvironmentActionDisabled: false,
            isEnvironmentEditing: false,
            isRefreshingEnvironments: false,
            isRefreshingRepositories: false,
            isScopeChangeDisabled: false,
            isTargetRefreshing: false,
          },
          variablesMessages,
        }}
        variablesMessages={variablesMessages}
      />,
    )

    expect(screen.getByText('target panel container')).toBeTruthy()
    expect(screen.getByText('entries panel container')).toBeTruthy()
    expect(screen.getByText('global search dialog container')).toBeTruthy()
    expect(screen.getByText('environment create dialog container')).toBeTruthy()
    expect(screen.getByText('entry editor dialog container')).toBeTruthy()
    expect(screen.getByText('delete confirm dialog container')).toBeTruthy()
    expect(useVariablesRouteFocusManagementMock).toHaveBeenCalledWith({
      bulkInputId: 'bulk-input-id',
      entryEditorNeedsEnvironmentSelection: false,
      entryEditorRepository: 'acme/repo',
      entryNameInputId: 'entry-name-input',
      entryValueInputId: 'entry-value-input',
      globalSearchInputId: 'global-entry-search-input',
      isBulkEditorActive: false,
      isEntryEditorOpen: true,
      isGlobalSearchDialogOpen: false,
      isSingleEntryEditor: true,
    })
  })
})

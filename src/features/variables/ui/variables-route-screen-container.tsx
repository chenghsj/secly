import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import { useVariablesRouteFocusManagement } from '#/features/variables/controllers/use-variables-route-focus-management'
import { VariablesDeleteConfirmDialogContainer } from './variables-delete-confirm-dialog-container'
import type { VariablesDeleteConfirmDialogContainerProps } from './variables-delete-confirm-dialog-container'
import { VariablesEntriesPanelContainer } from './variables-entries-panel-container'
import type { VariablesEntriesPanelContainerProps } from './variables-entries-panel-container'
import { VariablesEnvironmentCreateDialogContainer } from './variables-environment-create-dialog-container'
import type { VariablesEnvironmentCreateDialogContainerProps } from './variables-environment-create-dialog-container'
import { VariablesEntryEditorDialogContainer } from './variables-entry-editor-dialog-container'
import type { VariablesEntryEditorDialogContainerProps } from './variables-entry-editor-dialog-container'
import { VariablesGlobalSearchDialogContainer } from './variables-global-search-dialog-container'
import type { VariablesGlobalSearchDialogContainerProps } from './variables-global-search-dialog-container'
import { VariablesRouteScreen } from './variables-route-screen'
import { VariablesTargetPanelContainer } from './variables-target-panel-container'
import type { VariablesTargetPanelContainerProps } from './variables-target-panel-container'

export type VariablesRouteScreenContainerProps = {
  deleteDialog: VariablesDeleteConfirmDialogContainerProps
  entriesPanel: VariablesEntriesPanelContainerProps
  entryEditorDialog: VariablesEntryEditorDialogContainerProps
  environmentCreateDialog: VariablesEnvironmentCreateDialogContainerProps
  focusManagement: {
    bulkInputId: string
    entryEditorNeedsEnvironmentSelection: boolean
    entryEditorRepository: string
    entryNameInputId: string
    entryValueInputId: string
    globalSearchInputId: string
    isBulkEditorActive: boolean
    isEntryEditorOpen: boolean
    isGlobalSearchDialogOpen: boolean
    isSingleEntryEditor: boolean
  }
  globalSearchDialog: VariablesGlobalSearchDialogContainerProps
  isAuthenticated: boolean
  isGlobalSearchDialogOpen: boolean
  onOpenGlobalSearch: () => void
  scopeTitle: string
  targetPanel: VariablesTargetPanelContainerProps
  variablesMessages: VariablesMessages
}

export function VariablesRouteScreenContainer({
  deleteDialog,
  entriesPanel,
  entryEditorDialog,
  environmentCreateDialog,
  focusManagement,
  globalSearchDialog,
  isAuthenticated,
  isGlobalSearchDialogOpen,
  onOpenGlobalSearch,
  scopeTitle,
  targetPanel,
  variablesMessages,
}: VariablesRouteScreenContainerProps) {
  useVariablesRouteFocusManagement(focusManagement)

  return (
    <VariablesRouteScreen
      deleteDialog={<VariablesDeleteConfirmDialogContainer {...deleteDialog} />}
      entriesPanel={<VariablesEntriesPanelContainer {...entriesPanel} />}
      entryEditorDialog={
        <VariablesEntryEditorDialogContainer {...entryEditorDialog} />
      }
      environmentCreateDialog={
        <VariablesEnvironmentCreateDialogContainer
          {...environmentCreateDialog}
        />
      }
      globalSearchDialog={
        <VariablesGlobalSearchDialogContainer {...globalSearchDialog} />
      }
      isAuthenticated={isAuthenticated}
      isGlobalSearchDialogOpen={isGlobalSearchDialogOpen}
      onOpenGlobalSearch={onOpenGlobalSearch}
      scopeTitle={scopeTitle}
      targetPanel={<VariablesTargetPanelContainer {...targetPanel} />}
      variablesMessages={variablesMessages}
    />
  )
}

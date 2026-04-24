import type { ReactNode } from 'react'
import type { EditorTab, SettingsScope } from '#/lib/variables-route-search'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  VariablesEntryEditorDialog,
  type VariablesEntryEditorDialogProps,
} from './variables-entry-editor-dialog'

export type VariablesEntryEditorDialogContainerProps = {
  actions: VariablesEntryEditorDialogProps['actions']
  activeTab: EditorTab
  bulkApplyLabel: string
  bulkEntryPanel: ReactNode
  canMutateEntryEditorScope: boolean
  entryEditorDescription: string
  entryEditorNeedsEnvironmentSelection: boolean
  entryEditorRepository: string
  entryEditorScope: SettingsScope
  entryEditorTitle: string
  isBulkEditorActive: boolean
  isBulkSaving: boolean
  isSaving: boolean
  isSingleEntryEditor: boolean
  open: boolean
  parsedBulkEntryCount: number
  parsedBulkErrorCount: number
  saveActionLabel: string
  singleEntryForm: ReactNode
  variablesMessages: VariablesMessages
}

export function VariablesEntryEditorDialogContainer({
  actions,
  activeTab,
  bulkApplyLabel,
  bulkEntryPanel,
  canMutateEntryEditorScope,
  entryEditorDescription,
  entryEditorNeedsEnvironmentSelection,
  entryEditorRepository,
  entryEditorScope,
  entryEditorTitle,
  isBulkEditorActive,
  isBulkSaving,
  isSaving,
  isSingleEntryEditor,
  open,
  parsedBulkEntryCount,
  parsedBulkErrorCount,
  saveActionLabel,
  singleEntryForm,
  variablesMessages,
}: VariablesEntryEditorDialogContainerProps) {
  return (
    <VariablesEntryEditorDialog
      actions={actions}
      content={{
        bulkApplyLabel,
        bulkEntryPanel,
        description: entryEditorDescription,
        saveActionLabel,
        singleEntryForm,
        title: entryEditorTitle,
      }}
      state={{
        activeTab,
        canMutateEntryEditorScope,
        entryEditorNeedsEnvironmentSelection,
        entryEditorRepository,
        entryEditorScope,
        isBulkEditorActive,
        isBulkSaving,
        isSaving,
        isSingleEntryEditor,
        open,
        parsedBulkEntryCount,
        parsedBulkErrorCount,
      }}
      variablesMessages={variablesMessages}
    />
  )
}

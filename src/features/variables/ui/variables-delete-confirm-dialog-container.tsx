import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  VariablesDeleteConfirmDialog,
  type VariablesDeleteConfirmDialogProps,
} from './variables-dialogs'

export type VariablesDeleteConfirmDialogContainerProps = {
  actions: VariablesDeleteConfirmDialogProps['actions']
  state: VariablesDeleteConfirmDialogProps['state']
  variablesMessages: VariablesMessages
}

export function VariablesDeleteConfirmDialogContainer({
  actions,
  state,
  variablesMessages,
}: VariablesDeleteConfirmDialogContainerProps) {
  return (
    <VariablesDeleteConfirmDialog
      actions={actions}
      state={state}
      variablesMessages={variablesMessages}
    />
  )
}

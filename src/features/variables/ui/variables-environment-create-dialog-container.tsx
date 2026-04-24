import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  VariablesEnvironmentCreateDialog,
  type VariablesEnvironmentCreateDialogProps,
} from './variables-dialogs'

export type VariablesEnvironmentCreateDialogContainerProps = {
  actions: VariablesEnvironmentCreateDialogProps['actions']
  environmentName: string
  environmentNameError: string | null
  environmentNameErrorId: string
  environmentNameInputId: string
  isCreatingEnvironment: boolean
  isEnvironmentCreateOpen: boolean
  selectedRepository: string
  variablesMessages: VariablesMessages
}

export function VariablesEnvironmentCreateDialogContainer({
  actions,
  environmentName,
  environmentNameError,
  environmentNameErrorId,
  environmentNameInputId,
  isCreatingEnvironment,
  isEnvironmentCreateOpen,
  selectedRepository,
  variablesMessages,
}: VariablesEnvironmentCreateDialogContainerProps) {
  return (
    <VariablesEnvironmentCreateDialog
      actions={actions}
      state={{
        environmentName,
        environmentNameError,
        environmentNameErrorId,
        environmentNameInputId,
        isCreatingEnvironment,
        isEnvironmentCreateOpen,
        selectedRepository,
      }}
      variablesMessages={variablesMessages}
    />
  )
}

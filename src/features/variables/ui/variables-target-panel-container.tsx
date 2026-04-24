import type { SettingsScope } from '#/lib/variables-route-search'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  createEnvironmentOptions,
  createRepositoryOptions,
} from '#/features/variables/models/variables-page-derivations'
import type { GhEnvironmentSummary } from '#/server/gh-actions-settings.server'
import type { GhRepositorySummary } from '#/server/gh-repository-variables.server'
import {
  VariablesTargetPanel,
  type VariablesTargetPanelProps,
} from './variables-target-panel'

export type VariablesTargetPanelContainerProps = {
  actions: VariablesTargetPanelProps['actions']
  activeScope: SettingsScope
  environmentSelectionError: string | null
  environments: GhEnvironmentSummary[]
  repositoryError: string | null
  repositories: GhRepositorySummary[]
  selectedEnvironment: string
  selectedRepository: string
  status: VariablesTargetPanelProps['status']
  variablesMessages: VariablesMessages
}

export function VariablesTargetPanelContainer({
  actions,
  activeScope,
  environmentSelectionError,
  environments,
  repositoryError,
  repositories,
  selectedEnvironment,
  selectedRepository,
  status,
  variablesMessages,
}: VariablesTargetPanelContainerProps) {
  const repositoryOptions = createRepositoryOptions(repositories)
  const environmentOptions = createEnvironmentOptions({
    activeScope,
    emptyOptionLabel:
      activeScope === 'environment-secrets'
        ? variablesMessages.environmentEmptySecretOptionLabel
        : variablesMessages.environmentEmptyOptionLabel,
    environments,
  })

  return (
    <VariablesTargetPanel
      actions={actions}
      environment={{
        environments,
        error: environmentSelectionError,
        options: environmentOptions,
        selected: selectedEnvironment,
      }}
      repository={{
        error: repositoryError,
        options: repositoryOptions,
        repositories,
        selected: selectedRepository,
      }}
      scope={{
        activeScope,
      }}
      status={status}
      variablesMessages={variablesMessages}
    />
  )
}

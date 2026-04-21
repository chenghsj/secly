import type { SettingsScope } from '#/lib/variables-route-search'
import type { AppMessages } from '#/messages'
import type {
  GhActionsSecret,
  GhActionsVariable,
  GhEnvironmentSummary,
} from '#/server/gh-actions-settings.server'
import type { GhAuthStatus } from '#/server/gh-auth.server'
import type {
  GhRepositorySummary,
  GhRepositoryVariable,
} from '#/server/gh-repository-variables.server'

export type SettingsEntry = {
  createdAt?: string
  name: string
  updatedAt: string
  value?: string
  visibility?: string | null
}

export type GlobalSearchResult = SettingsEntry & {
  environmentName?: string
  id: string
  repository: string
  scope: SettingsScope
  searchText: string
}

export type GlobalSearchEnvironmentEntries = {
  environment: GhEnvironmentSummary
  secrets: GhActionsSecret[]
  variables: GhActionsVariable[]
}

export type GlobalSearchLoadResult = {
  environmentEntries: GlobalSearchEnvironmentEntries[]
  environments: GhEnvironmentSummary[]
  repository: string
  repositorySecrets: GhActionsSecret[]
  repositoryVariables: GhRepositoryVariable[]
  results: GlobalSearchResult[]
}

export type BulkVariableDraft = {
  line: number
  name: string
  value: string
}

export type ParsedBulkVariables = {
  duplicates: string[]
  entries: BulkVariableDraft[]
  errors: string[]
}

export type VariablesMessages = AppMessages['variables']

export type PendingDeleteState =
  | {
      entryNames: string[]
      environmentName: string
      kind: 'entries'
      repository: string
      scope: SettingsScope
      targetLabel: string
    }
  | {
      environmentName: string
      kind: 'environment'
      repository: string
    }

export type EntryEditorContext = {
  environmentName: string
  repository: string
  scope: SettingsScope
}

export type VariablesLoaderData = {
  environmentSecrets: GhActionsSecret[]
  environmentSecretsKey: string
  environmentVariables: GhActionsVariable[]
  environmentVariablesKey: string
  environments: GhEnvironmentSummary[]
  environmentsRepository: string
  initialRepository: string
  repositories: GhRepositorySummary[]
  repositorySecrets: GhActionsSecret[]
  repositorySecretsRepository: string
  repositoryVariables: GhRepositoryVariable[]
  repositoryVariablesRepository: string
  status: GhAuthStatus
}

export type VariablesPageDataSnapshot = Omit<VariablesLoaderData, 'status'>

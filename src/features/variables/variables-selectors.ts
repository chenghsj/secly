import type {
  EditorTab,
  SettingsScope,
  VariablesEntrySortDirection,
  VariablesEntrySortField,
  VariablesSearch,
} from '#/lib/variables-route-search'
import { defaultLocale, resolveLocale, translations } from '#/messages'
import type { AppLocale } from '#/messages'
import type { GhActionsSecret } from '#/server/gh-actions-settings.server'
import type { GhAuthStatus } from '#/server/gh-auth.server'
import type { GhRepositoryVariable } from '#/server/gh-repository-variables.server'
import type {
  BulkVariableDraft,
  EntryEditorContext,
  GlobalSearchEnvironmentEntries,
  GlobalSearchResult,
  ParsedBulkVariables,
  PendingDeleteState,
  SettingsEntry,
  VariablesMessages,
} from './variables-types'

export const variableNamePattern = /^[A-Za-z_][A-Za-z0-9_]*$/

export const scopeSortOrder: Record<SettingsScope, number> = {
  'environment-secrets': 3,
  'environment-variables': 2,
  'repository-secrets': 1,
  'repository-variables': 0,
}

export const scopeMessageKeys: Record<
  SettingsScope,
  keyof VariablesMessages['scopes']
> = {
  'environment-secrets': 'environmentSecrets',
  'environment-variables': 'environmentVariables',
  'repository-secrets': 'repositorySecrets',
  'repository-variables': 'repositoryVariables',
}

export const scopeTabDisplayOrder: SettingsScope[] = [
  'repository-variables',
  'repository-secrets',
  'environment-variables',
  'environment-secrets',
]

export function formatMessage(
  template: string,
  values: Record<string, number | string>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

export function formatDateTime(value: string, locale: AppLocale) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

export function getSettingsEntrySortText(
  entry: SettingsEntry,
  isSecretScopeActive: boolean,
) {
  return isSecretScopeActive ? (entry.visibility ?? '') : (entry.value ?? '')
}

export function compareSettingsEntries(
  left: SettingsEntry,
  right: SettingsEntry,
  {
    collator,
    direction,
    field,
    isSecretScopeActive,
  }: {
    collator: Intl.Collator
    direction: VariablesEntrySortDirection
    field: VariablesEntrySortField
    isSecretScopeActive: boolean
  },
) {
  const directionMultiplier = direction === 'asc' ? 1 : -1

  if (field === 'updated') {
    const leftTimestamp = Date.parse(left.updatedAt)
    const rightTimestamp = Date.parse(right.updatedAt)
    const updatedComparison =
      Number.isNaN(leftTimestamp) || Number.isNaN(rightTimestamp)
        ? collator.compare(left.updatedAt, right.updatedAt)
        : leftTimestamp - rightTimestamp

    if (updatedComparison !== 0) {
      return updatedComparison * directionMultiplier
    }
  } else {
    const leftValue =
      field === 'name'
        ? left.name
        : getSettingsEntrySortText(left, isSecretScopeActive)
    const rightValue =
      field === 'name'
        ? right.name
        : getSettingsEntrySortText(right, isSecretScopeActive)
    const valueComparison = collator.compare(leftValue, rightValue)

    if (valueComparison !== 0) {
      return valueComparison * directionMultiplier
    }
  }

  const nameComparison = collator.compare(left.name, right.name)

  if (nameComparison !== 0) {
    return nameComparison
  }

  return right.updatedAt.localeCompare(left.updatedAt)
}

export function getScopeConfig(
  variablesMessages: VariablesMessages,
  scope: SettingsScope,
) {
  return variablesMessages.scopes[scopeMessageKeys[scope]]
}

export function getCountLabel(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural
}

export function compareGlobalSearchResults(
  left: GlobalSearchResult,
  right: GlobalSearchResult,
) {
  const nameComparison = left.name.localeCompare(right.name)

  if (nameComparison !== 0) {
    return nameComparison
  }

  const scopeComparison =
    scopeSortOrder[left.scope] - scopeSortOrder[right.scope]

  if (scopeComparison !== 0) {
    return scopeComparison
  }

  const environmentComparison = (left.environmentName ?? '').localeCompare(
    right.environmentName ?? '',
  )

  if (environmentComparison !== 0) {
    return environmentComparison
  }

  return right.updatedAt.localeCompare(left.updatedAt)
}

export function createGlobalSearchResult(
  entry: SettingsEntry,
  {
    environmentName,
    repository,
    scope,
  }: {
    environmentName?: string
    repository: string
    scope: SettingsScope
  },
): GlobalSearchResult {
  return {
    ...entry,
    environmentName,
    id: `${scope}:${repository}:${environmentName ?? ''}:${entry.name}`,
    repository,
    scope,
    searchText: [
      environmentName ?? '',
      entry.name,
      entry.value ?? '',
      entry.visibility ?? '',
    ]
      .join('\n')
      .toLowerCase(),
  }
}

export function createGlobalSearchResults({
  environmentEntries,
  repository,
  repositorySecrets,
  repositoryVariables,
}: {
  environmentEntries: GlobalSearchEnvironmentEntries[]
  repository: string
  repositorySecrets: GhActionsSecret[]
  repositoryVariables: GhRepositoryVariable[]
}) {
  return [
    ...repositoryVariables.map((entry) =>
      createGlobalSearchResult(entry, {
        repository,
        scope: 'repository-variables',
      }),
    ),
    ...repositorySecrets.map((entry) =>
      createGlobalSearchResult(entry, {
        repository,
        scope: 'repository-secrets',
      }),
    ),
    ...environmentEntries.flatMap(({ environment, secrets, variables }) => [
      ...variables.map((entry) =>
        createGlobalSearchResult(entry, {
          environmentName: environment.name,
          repository,
          scope: 'environment-variables',
        }),
      ),
      ...secrets.map((entry) =>
        createGlobalSearchResult(entry, {
          environmentName: environment.name,
          repository,
          scope: 'environment-secrets',
        }),
      ),
    ]),
  ].sort(compareGlobalSearchResults)
}

export function getVariablesAuthIdentity(status: GhAuthStatus) {
  return status.activeAccount
    ? `${status.activeAccount.host}:${status.activeAccount.login}:${status.activeAccount.state}`
    : status.authenticated
      ? 'authenticated'
      : 'anonymous'
}

export function getVariablesPageDataSnapshotKey(
  authIdentity: string,
  search: VariablesSearch,
) {
  return JSON.stringify({
    authIdentity,
    environment: search.environment ?? '',
    repository: search.repository ?? '',
    scope: search.scope ?? '',
  })
}

export function stripWrappingQuotes(value: string) {
  const trimmed = value.trim()

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

export function parseBulkVariables(
  input: string,
  variablesMessages: VariablesMessages,
): ParsedBulkVariables {
  const entriesByName = new Map<string, BulkVariableDraft>()
  const errors: string[] = []
  const duplicates = new Set<string>()

  input.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      return
    }

    const normalized = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed
    const separatorIndex = normalized.indexOf('=')

    if (separatorIndex <= 0) {
      errors.push(
        formatMessage(variablesMessages.validation.bulkExpectedNameValue, {
          line: index + 1,
        }),
      )
      return
    }

    const name = normalized.slice(0, separatorIndex).trim()
    const value = stripWrappingQuotes(normalized.slice(separatorIndex + 1))

    if (!variableNamePattern.test(name)) {
      errors.push(
        formatMessage(variablesMessages.validation.bulkInvalidName, {
          line: index + 1,
          name,
        }),
      )
      return
    }

    if (entriesByName.has(name)) {
      duplicates.add(name)
    }

    entriesByName.set(name, {
      line: index + 1,
      name,
      value,
    })
  })

  return {
    duplicates: Array.from(duplicates),
    entries: Array.from(entriesByName.values()),
    errors,
  }
}

export function isEnvironmentScope(scope: SettingsScope) {
  return scope === 'environment-secrets' || scope === 'environment-variables'
}

export function isSecretScope(scope: SettingsScope) {
  return scope === 'repository-secrets' || scope === 'environment-secrets'
}

export function upsertEntryList<T extends { name: string }>(
  currentEntries: T[],
  entry: T,
) {
  return [
    ...currentEntries.filter((item) => item.name !== entry.name),
    entry,
  ].sort((left, right) => left.name.localeCompare(right.name))
}

export function getTargetLabel(
  repository: string,
  targetEnvironmentName: string,
  scope: SettingsScope,
) {
  if (isEnvironmentScope(scope)) {
    return targetEnvironmentName
      ? `${repository} / ${targetEnvironmentName}`
      : repository
  }

  return repository
}

export function doesViewMatchEntryEditorContext(
  context: EntryEditorContext,
  {
    activeScope,
    selectedEnvironment,
    selectedRepository,
  }: {
    activeScope: SettingsScope
    selectedEnvironment: string
    selectedRepository: string
  },
) {
  return (
    context.repository === selectedRepository &&
    context.scope === activeScope &&
    (!isEnvironmentScope(context.scope) ||
      context.environmentName === selectedEnvironment)
  )
}

export function getPendingVariablesMessages() {
  if (typeof window === 'undefined') {
    return translations[defaultLocale].variables
  }

  const locale = resolveLocale(
    window.localStorage.getItem('gh-vardeck:locale') ??
      window.navigator.language,
  )

  return translations[locale].variables
}

export function buildPendingDeleteStateCopy({
  pendingDelete,
  variablesMessages,
}: {
  pendingDelete: PendingDeleteState | null
  variablesMessages: VariablesMessages
}) {
  const pendingDeleteEntryConfig =
    pendingDelete?.kind === 'entries'
      ? getScopeConfig(variablesMessages, pendingDelete.scope)
      : null
  const pendingDeleteSingleEntryName =
    pendingDelete?.kind === 'entries' && pendingDelete.entryNames.length === 1
      ? pendingDelete.entryNames[0]
      : null
  const pendingDeleteTitle = pendingDelete
    ? pendingDelete.kind === 'environment'
      ? formatMessage(variablesMessages.deleteDialog.environmentTitle, {
          name: pendingDelete.environmentName,
        })
      : pendingDeleteSingleEntryName
        ? formatMessage(variablesMessages.deleteDialog.entryTitle, {
            entry: pendingDeleteEntryConfig?.entryLabel ?? '',
            name: pendingDeleteSingleEntryName,
          })
        : formatMessage(variablesMessages.deleteDialog.entriesTitle, {
            count: pendingDelete.entryNames.length,
            entries: getCountLabel(
              pendingDelete.entryNames.length,
              pendingDeleteEntryConfig?.entryLabel ?? '',
              pendingDeleteEntryConfig?.entryPluralLabel ?? '',
            ),
          })
    : ''
  const pendingDeleteDescription = pendingDelete
    ? pendingDelete.kind === 'environment'
      ? formatMessage(variablesMessages.deleteDialog.environmentDescription, {
          name: pendingDelete.environmentName,
          repository: pendingDelete.repository,
        })
      : pendingDeleteSingleEntryName
        ? formatMessage(variablesMessages.deleteDialog.entryDescription, {
            name: pendingDeleteSingleEntryName,
            target: pendingDelete.targetLabel,
          })
        : formatMessage(variablesMessages.deleteDialog.entriesDescription, {
            count: pendingDelete.entryNames.length,
            entries: getCountLabel(
              pendingDelete.entryNames.length,
              pendingDeleteEntryConfig?.entryLabel ?? '',
              pendingDeleteEntryConfig?.entryPluralLabel ?? '',
            ),
            target: pendingDelete.targetLabel,
          })
    : ''
  const pendingDeleteActionLabel = pendingDelete
    ? pendingDelete.kind === 'environment'
      ? variablesMessages.actions.deleteEnvironment
      : pendingDeleteSingleEntryName
        ? variablesMessages.actions.delete
        : variablesMessages.actions.deleteSelected
    : variablesMessages.actions.delete
  const pendingDeleteEntryNames =
    pendingDelete?.kind === 'entries' && pendingDelete.entryNames.length > 1
      ? [...pendingDelete.entryNames].sort((left, right) =>
          left.localeCompare(right),
        )
      : []
  const pendingDeleteConfirmationValue = pendingDelete
    ? pendingDelete.kind === 'environment'
      ? pendingDelete.environmentName
      : pendingDelete.entryNames.length === 1
        ? pendingDelete.entryNames[0]
        : pendingDelete.repository
    : null

  return {
    pendingDeleteActionLabel,
    pendingDeleteConfirmationValue,
    pendingDeleteDescription,
    pendingDeleteEntryConfig,
    pendingDeleteEntryNames,
    pendingDeleteSingleEntryName,
    pendingDeleteTitle,
  }
}

export function getSingleEntryFormLabels({
  entryEditorScope,
  entryEditorScopeConfig,
  locale,
  variablesMessages,
}: {
  entryEditorScope: SettingsScope
  entryEditorScopeConfig: VariablesMessages['scopes'][keyof VariablesMessages['scopes']]
  locale: AppLocale
  variablesMessages: VariablesMessages
}) {
  const entryNameLabel =
    locale === 'en'
      ? `${entryEditorScopeConfig.entryTitle} ${variablesMessages.columns.name}`
      : `${entryEditorScopeConfig.entryTitle}${variablesMessages.columns.name}`
  const entryValueLabel =
    locale === 'en'
      ? `${entryEditorScopeConfig.entryTitle} ${variablesMessages.columns.value}`
      : `${entryEditorScopeConfig.entryTitle}${variablesMessages.columns.value}`
  const entryEditorTitle = isSecretScope(entryEditorScope)
    ? variablesMessages.secretSettingsTitle
    : variablesMessages.variableSettingsTitle

  return {
    entryEditorTitle,
    entryNameLabel,
    entryValueLabel,
  }
}

export function getBulkPreviewSummary({
  entryEditorScopeConfig,
  parsedBulk,
  variablesMessages,
}: {
  entryEditorScopeConfig: VariablesMessages['scopes'][keyof VariablesMessages['scopes']]
  parsedBulk: ParsedBulkVariables
  variablesMessages: VariablesMessages
}) {
  const previewSummary =
    parsedBulk.entries.length === 1
      ? formatMessage(variablesMessages.states.previewReadySingular, {
          entry: entryEditorScopeConfig.entryLabel,
        })
      : formatMessage(variablesMessages.states.previewReadyPlural, {
          count: parsedBulk.entries.length,
          entries: entryEditorScopeConfig.entryPluralLabel,
        })
  const duplicateSummary =
    parsedBulk.duplicates.length === 0
      ? variablesMessages.states.noDuplicates
      : parsedBulk.duplicates.length === 1
        ? variablesMessages.states.duplicatesSingular
        : formatMessage(variablesMessages.states.duplicatesPlural, {
            count: parsedBulk.duplicates.length,
          })

  return {
    duplicateSummary,
    previewSummary,
  }
}

export function getEditorTabState({
  activeTab,
  editingEntryName,
}: {
  activeTab: EditorTab
  editingEntryName: string | null
}) {
  const isSingleEntryEditor = Boolean(editingEntryName)
  const isBulkEditorActive = !isSingleEntryEditor && activeTab === 'bulk'

  return {
    isBulkEditorActive,
    isSingleEntryEditor,
  }
}

import {
  addRepositoryEnvironment,
  removeRepositoryEnvironment,
} from '#/server/gh-actions-settings.functions'
import type { BulkVariableDraft, PendingDeleteState } from './variables-types'
import type { SettingsScope } from '#/lib/variables-route-search'
import {
  deleteEntryWithScopeStrategy,
  saveEntryWithScopeStrategy,
} from './variables-scope-strategies'

export async function saveEntryForScope({
  environmentName,
  name,
  repository,
  scope,
  value,
}: {
  environmentName: string
  name: string
  repository: string
  scope: SettingsScope
  value: string
}) {
  return saveEntryWithScopeStrategy({
    environmentName,
    name,
    repository,
    scope,
    value,
  })
}

export async function saveBulkEntriesForScope({
  entries,
  environmentName,
  repository,
  scope,
}: {
  entries: BulkVariableDraft[]
  environmentName: string
  repository: string
  scope: SettingsScope
}) {
  let appliedCount = 0

  for (const entry of entries) {
    await saveEntryForScope({
      environmentName,
      name: entry.name,
      repository,
      scope,
      value: entry.value,
    })
    appliedCount += 1
  }

  return appliedCount
}

export async function deleteEntryForScope(
  deleteRequest: Extract<PendingDeleteState, { kind: 'entries' }>,
  entryName: string,
) {
  await deleteEntryWithScopeStrategy(deleteRequest, entryName)
}

export async function createEnvironmentForRepository({
  environmentName,
  repository,
}: {
  environmentName: string
  repository: string
}) {
  return addRepositoryEnvironment({
    data: {
      environmentName,
      repository,
    },
  })
}

export async function deleteEnvironmentForRepository({
  environmentName,
  repository,
}: {
  environmentName: string
  repository: string
}) {
  return removeRepositoryEnvironment({
    data: {
      environmentName,
      repository,
    },
  })
}

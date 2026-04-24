import type { SettingsScope } from '#/lib/variables-route-search'
import {
  removeRepositoryVariable,
  saveRepositoryVariable,
} from '#/server/gh-repository-variables.functions'
import {
  removeEnvironmentSecret,
  removeEnvironmentVariable,
  removeRepositorySecret,
  saveEnvironmentSecret,
  saveEnvironmentVariable,
  saveRepositorySecret,
} from '#/server/gh-actions-settings.functions'
import type { VariablesStore } from '#/features/variables/state/variables-store'
import type { PendingDeleteState, SettingsEntry } from './variables-types'
import { upsertEntryList } from '#/features/variables/models/variables-helpers'

type ScopeMutationInput = {
  environmentName: string
  name: string
  repository: string
  value: string
}

type ScopeDeleteInput = {
  environmentName: string
  name: string
  repository: string
}

export type ScopeStoreControls = Pick<
  VariablesStore,
  | 'setEnvironmentSecrets'
  | 'setEnvironmentSecretsKey'
  | 'setEnvironmentVariables'
  | 'setEnvironmentVariablesKey'
  | 'setRepositorySecrets'
  | 'setRepositorySecretsRepository'
  | 'setRepositoryVariables'
  | 'setRepositoryVariablesRepository'
>

type ScopeStrategy = {
  remove: (input: ScopeDeleteInput) => Promise<void>
  removeFromStore: (store: ScopeStoreControls, deletedNames: string[]) => void
  save: (input: ScopeMutationInput) => Promise<{
    created: boolean
    entry: SettingsEntry
  }>
  upsertInStore: (
    store: ScopeStoreControls,
    entry: SettingsEntry,
    target: { environmentName: string; repository: string },
  ) => void
}

function createDeletedNameSet(deletedNames: string[]) {
  return new Set(deletedNames)
}

export const scopeStrategies: Record<SettingsScope, ScopeStrategy> = {
  'repository-variables': {
    remove: async ({ name, repository }) => {
      await removeRepositoryVariable({
        data: { name, repository },
      })
    },
    removeFromStore: (store, deletedNames) => {
      const deletedNameSet = createDeletedNameSet(deletedNames)

      store.setRepositoryVariables((entries) =>
        entries.filter((entry) => !deletedNameSet.has(entry.name)),
      )
    },
    save: async ({ name, repository, value }) => {
      const result = await saveRepositoryVariable({
        data: { name, repository, value },
      })

      return {
        created: result.created,
        entry: result.variable satisfies SettingsEntry,
      }
    },
    upsertInStore: (store, entry, target) => {
      store.setRepositoryVariables((entries) =>
        upsertEntryList(entries, entry as (typeof entries)[number]),
      )
      store.setRepositoryVariablesRepository(target.repository)
    },
  },
  'repository-secrets': {
    remove: async ({ name, repository }) => {
      await removeRepositorySecret({
        data: { name, repository },
      })
    },
    removeFromStore: (store, deletedNames) => {
      const deletedNameSet = createDeletedNameSet(deletedNames)

      store.setRepositorySecrets((entries) =>
        entries.filter((entry) => !deletedNameSet.has(entry.name)),
      )
    },
    save: async ({ name, repository, value }) => {
      const result = await saveRepositorySecret({
        data: { name, repository, value },
      })

      return {
        created: result.created,
        entry: result.secret satisfies SettingsEntry,
      }
    },
    upsertInStore: (store, entry, target) => {
      store.setRepositorySecrets((entries) =>
        upsertEntryList(entries, entry as (typeof entries)[number]),
      )
      store.setRepositorySecretsRepository(target.repository)
    },
  },
  'environment-variables': {
    remove: async ({ environmentName, name, repository }) => {
      await removeEnvironmentVariable({
        data: { environmentName, name, repository },
      })
    },
    removeFromStore: (store, deletedNames) => {
      const deletedNameSet = createDeletedNameSet(deletedNames)

      store.setEnvironmentVariables((entries) =>
        entries.filter((entry) => !deletedNameSet.has(entry.name)),
      )
    },
    save: async ({ environmentName, name, repository, value }) => {
      const result = await saveEnvironmentVariable({
        data: { environmentName, name, repository, value },
      })

      return {
        created: result.created,
        entry: result.variable satisfies SettingsEntry,
      }
    },
    upsertInStore: (store, entry, target) => {
      store.setEnvironmentVariables((entries) =>
        upsertEntryList(entries, entry as (typeof entries)[number]),
      )
      store.setEnvironmentVariablesKey(
        `${target.repository}:${target.environmentName}`,
      )
    },
  },
  'environment-secrets': {
    remove: async ({ environmentName, name, repository }) => {
      await removeEnvironmentSecret({
        data: { environmentName, name, repository },
      })
    },
    removeFromStore: (store, deletedNames) => {
      const deletedNameSet = createDeletedNameSet(deletedNames)

      store.setEnvironmentSecrets((entries) =>
        entries.filter((entry) => !deletedNameSet.has(entry.name)),
      )
    },
    save: async ({ environmentName, name, repository, value }) => {
      const result = await saveEnvironmentSecret({
        data: { environmentName, name, repository, value },
      })

      return {
        created: result.created,
        entry: result.secret satisfies SettingsEntry,
      }
    },
    upsertInStore: (store, entry, target) => {
      store.setEnvironmentSecrets((entries) =>
        upsertEntryList(entries, entry as (typeof entries)[number]),
      )
      store.setEnvironmentSecretsKey(
        `${target.repository}:${target.environmentName}`,
      )
    },
  },
}

export function saveEntryWithScopeStrategy({
  environmentName,
  name,
  repository,
  scope,
  value,
}: ScopeMutationInput & { scope: SettingsScope }) {
  return scopeStrategies[scope].save({
    environmentName,
    name,
    repository,
    value,
  })
}

export function deleteEntryWithScopeStrategy(
  deleteRequest: Extract<PendingDeleteState, { kind: 'entries' }>,
  entryName: string,
) {
  return scopeStrategies[deleteRequest.scope].remove({
    environmentName: deleteRequest.environmentName,
    name: entryName,
    repository: deleteRequest.repository,
  })
}

export function upsertEntryInScopeStore({
  entry,
  environmentName,
  repository,
  scope,
  store,
}: {
  entry: SettingsEntry
  environmentName: string
  repository: string
  scope: SettingsScope
  store: ScopeStoreControls
}) {
  scopeStrategies[scope].upsertInStore(store, entry, {
    environmentName,
    repository,
  })
}

export function removeEntriesFromScopeStore({
  deletedNames,
  scope,
  store,
}: {
  deletedNames: string[]
  scope: SettingsScope
  store: ScopeStoreControls
}) {
  scopeStrategies[scope].removeFromStore(store, deletedNames)
}

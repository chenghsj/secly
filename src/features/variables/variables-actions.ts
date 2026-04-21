import {
  addRepositoryEnvironment,
  removeEnvironmentSecret,
  removeEnvironmentVariable,
  removeRepositoryEnvironment,
  removeRepositorySecret,
  saveEnvironmentSecret,
  saveEnvironmentVariable,
  saveRepositorySecret,
} from '#/server/gh-actions-settings.functions'
import {
  removeRepositoryVariable,
  saveRepositoryVariable,
} from '#/server/gh-repository-variables.functions'
import type {
  BulkVariableDraft,
  PendingDeleteState,
  SettingsEntry,
} from './variables-types'
import type { SettingsScope } from '#/lib/variables-route-search'

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
  if (scope === 'repository-variables') {
    const result = await saveRepositoryVariable({
      data: {
        name,
        repository,
        value,
      },
    })

    return {
      created: result.created,
      entry: result.variable satisfies SettingsEntry,
    }
  }

  if (scope === 'repository-secrets') {
    const result = await saveRepositorySecret({
      data: {
        name,
        repository,
        value,
      },
    })

    return {
      created: result.created,
      entry: result.secret satisfies SettingsEntry,
    }
  }

  if (scope === 'environment-variables') {
    const result = await saveEnvironmentVariable({
      data: {
        environmentName,
        name,
        repository,
        value,
      },
    })

    return {
      created: result.created,
      entry: result.variable satisfies SettingsEntry,
    }
  }

  const result = await saveEnvironmentSecret({
    data: {
      environmentName,
      name,
      repository,
      value,
    },
  })

  return {
    created: result.created,
    entry: result.secret satisfies SettingsEntry,
  }
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
  if (deleteRequest.scope === 'repository-variables') {
    await removeRepositoryVariable({
      data: {
        name: entryName,
        repository: deleteRequest.repository,
      },
    })
    return
  }

  if (deleteRequest.scope === 'repository-secrets') {
    await removeRepositorySecret({
      data: {
        name: entryName,
        repository: deleteRequest.repository,
      },
    })
    return
  }

  if (deleteRequest.scope === 'environment-variables') {
    await removeEnvironmentVariable({
      data: {
        environmentName: deleteRequest.environmentName,
        name: entryName,
        repository: deleteRequest.repository,
      },
    })
    return
  }

  await removeEnvironmentSecret({
    data: {
      environmentName: deleteRequest.environmentName,
      name: entryName,
      repository: deleteRequest.repository,
    },
  })
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

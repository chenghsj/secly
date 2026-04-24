import type {
  VariablesPageDataSnapshot,
  VariablesLoaderData,
} from '#/features/variables/domain/variables-types'

const variablesPageDataSnapshots = new Map<string, VariablesPageDataSnapshot>()
const PREFETCH_AUTH_IDENTITY_CACHE_LIMIT = 3
const PREFETCH_REPOSITORY_CACHE_LIMIT = 8
const PREFETCH_ENVIRONMENT_CACHE_LIMIT = 16

class LruMap<Key, Value> extends Map<Key, Value> {
  constructor(private readonly limit: number) {
    super()
  }

  override get(key: Key) {
    const value = super.get(key)

    if (value === undefined || !super.has(key)) {
      return value
    }

    super.delete(key)
    super.set(key, value)

    return value
  }

  override set(key: Key, value: Value) {
    if (super.has(key)) {
      super.delete(key)
    }

    super.set(key, value)

    if (this.size > this.limit) {
      const oldestKey = this.keys().next().value

      if (oldestKey !== undefined) {
        super.delete(oldestKey)
      }
    }

    return this
  }
}

export type VariablesPagePrefetchCache = {
  environmentSecretsByKey: Map<
    string,
    VariablesLoaderData['environmentSecrets']
  >
  environmentVariablesByKey: Map<
    string,
    VariablesLoaderData['environmentVariables']
  >
  environmentsByRepository: Map<string, VariablesLoaderData['environments']>
  repositorySecretsByRepository: Map<
    string,
    VariablesLoaderData['repositorySecrets']
  >
  repositoryVariablesByRepository: Map<
    string,
    VariablesLoaderData['repositoryVariables']
  >
}

const variablesPagePrefetchCaches = new LruMap<
  string,
  VariablesPagePrefetchCache
>(PREFETCH_AUTH_IDENTITY_CACHE_LIMIT)

function createVariablesPagePrefetchCache(): VariablesPagePrefetchCache {
  return {
    environmentSecretsByKey: new LruMap(PREFETCH_ENVIRONMENT_CACHE_LIMIT),
    environmentVariablesByKey: new LruMap(PREFETCH_ENVIRONMENT_CACHE_LIMIT),
    environmentsByRepository: new LruMap(PREFETCH_REPOSITORY_CACHE_LIMIT),
    repositorySecretsByRepository: new LruMap(PREFETCH_REPOSITORY_CACHE_LIMIT),
    repositoryVariablesByRepository: new LruMap(
      PREFETCH_REPOSITORY_CACHE_LIMIT,
    ),
  }
}

export function readVariablesPageDataSnapshot({
  allowSnapshotRestore,
  dataSnapshotKey,
}: {
  allowSnapshotRestore: boolean
  dataSnapshotKey: string
}) {
  if (!allowSnapshotRestore) {
    return null
  }

  return variablesPageDataSnapshots.get(dataSnapshotKey) ?? null
}

export function writeVariablesPageDataSnapshot({
  dataSnapshotKey,
  initialRepository,
  loaderData,
}: {
  dataSnapshotKey: string
  initialRepository: string
  loaderData: Pick<
    VariablesLoaderData,
    | 'environmentSecrets'
    | 'environmentSecretsKey'
    | 'environmentVariables'
    | 'environmentVariablesKey'
    | 'environments'
    | 'environmentsRepository'
    | 'repositories'
    | 'repositorySecrets'
    | 'repositorySecretsRepository'
    | 'repositoryVariables'
    | 'repositoryVariablesRepository'
  >
}) {
  variablesPageDataSnapshots.set(dataSnapshotKey, {
    environmentSecrets: loaderData.environmentSecrets,
    environmentSecretsKey: loaderData.environmentSecretsKey,
    environmentVariables: loaderData.environmentVariables,
    environmentVariablesKey: loaderData.environmentVariablesKey,
    environments: loaderData.environments,
    environmentsRepository: loaderData.environmentsRepository,
    initialRepository,
    repositories: loaderData.repositories,
    repositorySecrets: loaderData.repositorySecrets,
    repositorySecretsRepository: loaderData.repositorySecretsRepository,
    repositoryVariables: loaderData.repositoryVariables,
    repositoryVariablesRepository: loaderData.repositoryVariablesRepository,
  })
}

export function getVariablesPagePrefetchCache({
  allowSnapshotRestore,
  authIdentity,
}: {
  allowSnapshotRestore: boolean
  authIdentity: string
}) {
  if (!allowSnapshotRestore) {
    const emptyCache = createVariablesPagePrefetchCache()

    variablesPagePrefetchCaches.set(authIdentity, emptyCache)
    return emptyCache
  }

  const cached = variablesPagePrefetchCaches.get(authIdentity)

  if (cached) {
    return cached
  }

  const created = createVariablesPagePrefetchCache()

  variablesPagePrefetchCaches.set(authIdentity, created)

  return created
}

export function clearVariablesPageDataSnapshots() {
  variablesPageDataSnapshots.clear()
  variablesPagePrefetchCaches.clear()
}

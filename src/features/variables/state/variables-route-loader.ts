import { redirect } from '@tanstack/react-router'
import type { VariablesSearch } from '#/lib/variables-route-search'
import type { VariablesLoaderData } from '#/features/variables/domain/variables-types'
import { resolvePreferredEnvironmentName } from '#/features/variables/models/variables-helpers'
import {
  getEnvironmentSecrets,
  getEnvironmentVariables,
  getRepositoryEnvironments,
  getRepositorySecrets,
} from '#/server/gh-actions-settings.functions'
import { refreshLocalGhAuthStatus } from '#/server/gh-auth.functions'
import type { GhAuthStatus } from '#/server/gh-auth.server'
import {
  getManageableRepositories,
  getRepositoryVariables,
} from '#/server/gh-repository-variables.functions'
import type { GhRepositorySummary } from '#/server/gh-repository-variables.server'

function createEmptyVariablesLoaderData(
  status: GhAuthStatus,
): VariablesLoaderData {
  return {
    environmentSecrets: [],
    environmentSecretsKey: '',
    environmentVariables: [],
    environmentVariablesKey: '',
    environments: [],
    environmentsRepository: '',
    initialRepository: '',
    repositories: [],
    repositorySecrets: [],
    repositorySecretsRepository: '',
    repositoryVariables: [],
    repositoryVariablesRepository: '',
    status,
  }
}

function resolveInitialRepository(
  repositories: GhRepositorySummary[],
  requestedRepository?: string,
) {
  if (
    requestedRepository &&
    repositories.some(
      (repository) => repository.nameWithOwner === requestedRepository,
    )
  ) {
    return requestedRepository
  }

  return repositories[0]?.nameWithOwner ?? ''
}

export async function loadVariablesRouteData(
  search: VariablesSearch,
): Promise<VariablesLoaderData> {
  const status = await refreshLocalGhAuthStatus()

  if (!status.authenticated) {
    throw redirect({ to: '/connect' })
  }

  const repositories = await getManageableRepositories()
  const initialRepository = resolveInitialRepository(
    repositories,
    search.repository,
  )
  const data: VariablesLoaderData = {
    ...createEmptyVariablesLoaderData(status),
    initialRepository,
    repositories,
  }

  if (!initialRepository) {
    return data
  }

  const activeScope = search.scope ?? 'repository-variables'

  if (activeScope === 'repository-variables') {
    data.repositoryVariables = await getRepositoryVariables({
      data: {
        repository: initialRepository,
      },
    })
    data.repositoryVariablesRepository = initialRepository
    return data
  }

  if (activeScope === 'repository-secrets') {
    data.repositorySecrets = await getRepositorySecrets({
      data: {
        repository: initialRepository,
      },
    })
    data.repositorySecretsRepository = initialRepository
    return data
  }

  data.environments = await getRepositoryEnvironments({
    data: {
      repository: initialRepository,
    },
  })
  data.environmentsRepository = initialRepository

  const initialEnvironment = resolvePreferredEnvironmentName({
    activeScope,
    environments: data.environments,
    requestedEnvironment: search.environment,
  })

  if (!initialEnvironment) {
    return data
  }

  if (activeScope === 'environment-variables') {
    data.environmentVariables = await getEnvironmentVariables({
      data: {
        environmentName: initialEnvironment,
        repository: initialRepository,
      },
    })
    data.environmentVariablesKey = `${initialRepository}:${initialEnvironment}`
    return data
  }

  data.environmentSecrets = await getEnvironmentSecrets({
    data: {
      environmentName: initialEnvironment,
      repository: initialRepository,
    },
  })
  data.environmentSecretsKey = `${initialRepository}:${initialEnvironment}`

  return data
}

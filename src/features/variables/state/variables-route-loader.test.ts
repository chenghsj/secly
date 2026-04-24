import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLI_LOGIN_COMMAND } from '#/lib/product'

const mocks = vi.hoisted(() => ({
  getEnvironmentSecrets: vi.fn(),
  getEnvironmentVariables: vi.fn(),
  getManageableRepositories: vi.fn(),
  getRepositoryEnvironments: vi.fn(),
  getRepositorySecrets: vi.fn(),
  getRepositoryVariables: vi.fn(),
  redirect: vi.fn((value: { to: string }) => value),
  refreshLocalGhAuthStatus: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  redirect: mocks.redirect,
}))

vi.mock('#/server/gh-auth.functions', () => ({
  refreshLocalGhAuthStatus: mocks.refreshLocalGhAuthStatus,
}))

vi.mock('#/server/gh-actions-settings.functions', () => ({
  getEnvironmentSecrets: mocks.getEnvironmentSecrets,
  getEnvironmentVariables: mocks.getEnvironmentVariables,
  getRepositoryEnvironments: mocks.getRepositoryEnvironments,
  getRepositorySecrets: mocks.getRepositorySecrets,
}))

vi.mock('#/server/gh-repository-variables.functions', () => ({
  getManageableRepositories: mocks.getManageableRepositories,
  getRepositoryVariables: mocks.getRepositoryVariables,
}))

import { loadVariablesRouteData } from './variables-route-loader'

function createAuthStatus(authenticated = true) {
  return {
    activeAccount: authenticated
      ? {
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'cheng',
          scopes: ['repo', 'workflow'],
          state: 'success',
          tokenSource: 'keyring',
        }
      : null,
    authenticated,
    cliLoginCommand: CLI_LOGIN_COMMAND,
    ghInstalled: true,
    ghLoginCommand: 'gh auth login --web',
    installUrl: 'https://cli.github.com',
    issues: [],
    knownAccounts: [],
    statusCommand: 'gh auth status --json hosts',
  }
}

function createRepositories() {
  return [
    {
      canManageVariables: true,
      isPrivate: false,
      name: 'foo',
      nameWithOwner: 'cheng/foo',
      ownerLogin: 'cheng',
      updatedAt: '2026-04-20T00:00:00Z',
      url: 'https://github.com/cheng/foo',
      visibility: 'public',
    },
    {
      canManageVariables: true,
      isPrivate: false,
      name: 'bar',
      nameWithOwner: 'cheng/bar',
      ownerLogin: 'cheng',
      updatedAt: '2026-04-21T00:00:00Z',
      url: 'https://github.com/cheng/bar',
      visibility: 'public',
    },
  ]
}

function createEnvironments() {
  return [
    {
      createdAt: '2026-04-19T00:00:00Z',
      htmlUrl: 'https://github.com/cheng/foo/environments/preview',
      name: 'preview',
      protectionRulesCount: 0,
      secretCount: 1,
      updatedAt: '2026-04-20T00:00:00Z',
      variableCount: 0,
    },
    {
      createdAt: '2026-04-19T00:00:00Z',
      htmlUrl: 'https://github.com/cheng/foo/environments/production',
      name: 'production',
      protectionRulesCount: 0,
      secretCount: 0,
      updatedAt: '2026-04-21T00:00:00Z',
      variableCount: 2,
    },
  ]
}

beforeEach(() => {
  vi.clearAllMocks()

  mocks.refreshLocalGhAuthStatus.mockResolvedValue(createAuthStatus())
  mocks.getManageableRepositories.mockResolvedValue(createRepositories())
  mocks.getRepositoryVariables.mockResolvedValue([
    {
      createdAt: '2026-04-19T00:00:00Z',
      name: 'API_URL',
      updatedAt: '2026-04-20T00:00:00Z',
      value: 'https://example.com',
    },
  ])
  mocks.getRepositorySecrets.mockResolvedValue([
    {
      name: 'API_TOKEN',
      updatedAt: '2026-04-20T00:00:00Z',
      visibility: 'private',
    },
  ])
  mocks.getRepositoryEnvironments.mockResolvedValue(createEnvironments())
  mocks.getEnvironmentVariables.mockResolvedValue([
    {
      createdAt: '2026-04-19T00:00:00Z',
      name: 'FEATURE_FLAG',
      updatedAt: '2026-04-20T00:00:00Z',
      value: 'enabled',
    },
  ])
  mocks.getEnvironmentSecrets.mockResolvedValue([
    {
      name: 'PROD_TOKEN',
      updatedAt: '2026-04-20T00:00:00Z',
      visibility: 'selected',
    },
  ])
})

describe('loadVariablesRouteData', () => {
  it('redirects unauthenticated users to connect before loading repositories', async () => {
    mocks.refreshLocalGhAuthStatus.mockResolvedValue(createAuthStatus(false))

    await expect(
      loadVariablesRouteData({ scope: 'repository-variables' }),
    ).rejects.toEqual({ to: '/connect' })

    expect(mocks.redirect).toHaveBeenCalledWith({ to: '/connect' })
    expect(mocks.getManageableRepositories).not.toHaveBeenCalled()
  })

  it('preloads repository variables for the requested repository scope', async () => {
    const data = await loadVariablesRouteData({
      repository: 'cheng/bar',
      scope: 'repository-variables',
    })

    expect(mocks.getRepositoryVariables).toHaveBeenCalledWith({
      data: {
        repository: 'cheng/bar',
      },
    })
    expect(mocks.getRepositorySecrets).not.toHaveBeenCalled()
    expect(mocks.getRepositoryEnvironments).not.toHaveBeenCalled()
    expect(data.initialRepository).toBe('cheng/bar')
    expect(data.repositoryVariablesRepository).toBe('cheng/bar')
    expect(data.repositoryVariables).toHaveLength(1)
  })

  it('preloads repository secrets for the repository secrets scope', async () => {
    const data = await loadVariablesRouteData({
      repository: 'cheng/foo',
      scope: 'repository-secrets',
    })

    expect(mocks.getRepositorySecrets).toHaveBeenCalledWith({
      data: {
        repository: 'cheng/foo',
      },
    })
    expect(mocks.getRepositoryVariables).not.toHaveBeenCalled()
    expect(mocks.getRepositoryEnvironments).not.toHaveBeenCalled()
    expect(data.repositorySecretsRepository).toBe('cheng/foo')
    expect(data.repositorySecrets).toHaveLength(1)
  })

  it('falls back to the first available repository and first populated environment for environment variables', async () => {
    const data = await loadVariablesRouteData({
      environment: 'missing-env',
      repository: 'cheng/missing',
      scope: 'environment-variables',
    })

    expect(mocks.getRepositoryEnvironments).toHaveBeenCalledWith({
      data: {
        repository: 'cheng/foo',
      },
    })
    expect(mocks.getEnvironmentVariables).toHaveBeenCalledWith({
      data: {
        environmentName: 'production',
        repository: 'cheng/foo',
      },
    })
    expect(data.initialRepository).toBe('cheng/foo')
    expect(data.environmentsRepository).toBe('cheng/foo')
    expect(data.environmentVariablesKey).toBe('cheng/foo:production')
    expect(data.environmentVariables).toHaveLength(1)
  })

  it('does not preload environment variables when every environment is empty', async () => {
    mocks.getRepositoryEnvironments.mockResolvedValue([
      {
        createdAt: '2026-04-19T00:00:00Z',
        htmlUrl: 'https://github.com/cheng/foo/environments/preview',
        name: 'preview',
        protectionRulesCount: 0,
        secretCount: 0,
        updatedAt: '2026-04-20T00:00:00Z',
        variableCount: 0,
      },
    ])

    const data = await loadVariablesRouteData({
      repository: 'cheng/foo',
      scope: 'environment-variables',
    })

    expect(mocks.getEnvironmentVariables).not.toHaveBeenCalled()
    expect(data.environmentsRepository).toBe('cheng/foo')
    expect(data.environmentVariablesKey).toBe('')
    expect(data.environmentVariables).toEqual([])
  })

  it('preloads environment secrets for the resolved environment secret scope', async () => {
    mocks.getRepositoryEnvironments.mockResolvedValue([
      {
        createdAt: '2026-04-19T00:00:00Z',
        htmlUrl: 'https://github.com/cheng/foo/environments/preview',
        name: 'preview',
        protectionRulesCount: 0,
        secretCount: 0,
        updatedAt: '2026-04-20T00:00:00Z',
        variableCount: 2,
      },
      {
        createdAt: '2026-04-19T00:00:00Z',
        htmlUrl: 'https://github.com/cheng/foo/environments/production',
        name: 'production',
        protectionRulesCount: 0,
        secretCount: 1,
        updatedAt: '2026-04-21T00:00:00Z',
        variableCount: 0,
      },
    ])

    const data = await loadVariablesRouteData({
      environment: 'missing',
      repository: 'cheng/foo',
      scope: 'environment-secrets',
    })

    expect(mocks.getRepositoryEnvironments).toHaveBeenCalledWith({
      data: {
        repository: 'cheng/foo',
      },
    })
    expect(mocks.getEnvironmentSecrets).toHaveBeenCalledWith({
      data: {
        environmentName: 'production',
        repository: 'cheng/foo',
      },
    })
    expect(data.environmentSecretsKey).toBe('cheng/foo:production')
    expect(data.environmentSecrets).toHaveLength(1)
  })
})

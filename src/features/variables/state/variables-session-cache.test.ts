import { afterEach, describe, expect, it } from 'vitest'
import { CLI_LOGIN_COMMAND } from '#/lib/product'
import {
  clearVariablesPageDataSnapshots,
  getVariablesPagePrefetchCache,
  readVariablesPageDataSnapshot,
  writeVariablesPageDataSnapshot,
} from './variables-session-cache'
import type { VariablesLoaderData } from '#/features/variables/domain/variables-types'

function createLoaderData(): VariablesLoaderData {
  return {
    environmentSecrets: [],
    environmentSecretsKey: '',
    environmentVariables: [],
    environmentVariablesKey: '',
    environments: [],
    environmentsRepository: '',
    initialRepository: 'cheng/foo',
    repositories: [
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
    ],
    repositorySecrets: [],
    repositorySecretsRepository: '',
    repositoryVariables: [
      {
        createdAt: '2026-04-19T00:00:00Z',
        name: 'API_URL',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'https://example.com',
      },
    ],
    repositoryVariablesRepository: 'cheng/foo',
    status: {
      activeAccount: {
        active: true,
        gitProtocol: 'https',
        host: 'github.com',
        login: 'cheng',
        scopes: ['repo', 'workflow'],
        state: 'success',
        tokenSource: 'keyring',
      },
      authenticated: true,
      cliLoginCommand: CLI_LOGIN_COMMAND,
      ghInstalled: true,
      ghLoginCommand: 'gh auth login --web',
      installUrl: 'https://cli.github.com',
      issues: [],
      knownAccounts: [],
      statusCommand: 'gh auth status --json hosts',
    },
  }
}

afterEach(() => {
  clearVariablesPageDataSnapshots()
})

describe('variables-session-cache', () => {
  it('returns null when snapshot restore is disabled', () => {
    const loaderData = createLoaderData()

    writeVariablesPageDataSnapshot({
      dataSnapshotKey: 'key',
      initialRepository: loaderData.initialRepository,
      loaderData,
    })

    expect(
      readVariablesPageDataSnapshot({
        allowSnapshotRestore: false,
        dataSnapshotKey: 'key',
      }),
    ).toBeNull()
  })

  it('reads back the stored snapshot for the matching key', () => {
    const loaderData = createLoaderData()

    writeVariablesPageDataSnapshot({
      dataSnapshotKey: 'key',
      initialRepository: 'cheng/bar',
      loaderData,
    })

    expect(
      readVariablesPageDataSnapshot({
        allowSnapshotRestore: true,
        dataSnapshotKey: 'key',
      }),
    ).toMatchObject({
      initialRepository: 'cheng/bar',
      repositoryVariablesRepository: 'cheng/foo',
    })
  })

  it('reuses the same prefetch cache for the same auth identity', () => {
    const cache = getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity: 'github.com:cheng:success',
    })

    cache.repositoryVariablesByRepository.set('cheng/foo', [
      {
        createdAt: '2026-04-19T00:00:00Z',
        name: 'API_URL',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'https://example.com',
      },
    ])

    expect(
      getVariablesPagePrefetchCache({
        allowSnapshotRestore: true,
        authIdentity: 'github.com:cheng:success',
      }).repositoryVariablesByRepository.get('cheng/foo'),
    ).toHaveLength(1)
  })

  it('resets the prefetch cache when snapshot restore is disabled', () => {
    const authIdentity = 'github.com:cheng:success'

    getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity,
    }).repositoryVariablesByRepository.set('cheng/foo', [
      {
        createdAt: '2026-04-19T00:00:00Z',
        name: 'API_URL',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'https://example.com',
      },
    ])

    expect(
      getVariablesPagePrefetchCache({
        allowSnapshotRestore: false,
        authIdentity,
      }).repositoryVariablesByRepository.size,
    ).toBe(0)
  })

  it('evicts the least recently used repository-prefetch entry when the cache is full', () => {
    const cache = getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity: 'github.com:cheng:success',
    })

    for (let index = 0; index < 8; index += 1) {
      cache.repositoryVariablesByRepository.set(`cheng/repo-${index}`, [
        {
          createdAt: '2026-04-19T00:00:00Z',
          name: `VAR_${index}`,
          updatedAt: '2026-04-20T00:00:00Z',
          value: `value-${index}`,
        },
      ])
    }

    expect(
      cache.repositoryVariablesByRepository.get('cheng/repo-0'),
    ).toHaveLength(1)

    cache.repositoryVariablesByRepository.set('cheng/repo-8', [
      {
        createdAt: '2026-04-19T00:00:00Z',
        name: 'VAR_8',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'value-8',
      },
    ])

    expect(cache.repositoryVariablesByRepository.size).toBe(8)
    expect(
      cache.repositoryVariablesByRepository.get('cheng/repo-0'),
    ).toHaveLength(1)
    expect(
      cache.repositoryVariablesByRepository.get('cheng/repo-1'),
    ).toBeUndefined()
  })

  it('evicts the least recently used auth-identity prefetch cache when the cache is full', () => {
    const authOneCache = getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity: 'github.com:cheng:one',
    })
    const authTwoCache = getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity: 'github.com:cheng:two',
    })
    getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity: 'github.com:cheng:three',
    })

    authTwoCache.repositoryVariablesByRepository.set('cheng/two', [
      {
        createdAt: '2026-04-19T00:00:00Z',
        name: 'AUTH_TWO_VAR',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'value-two',
      },
    ])

    expect(
      getVariablesPagePrefetchCache({
        allowSnapshotRestore: true,
        authIdentity: 'github.com:cheng:one',
      }),
    ).toBe(authOneCache)

    getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity: 'github.com:cheng:four',
    })

    const authTwoCacheAfterEviction = getVariablesPagePrefetchCache({
      allowSnapshotRestore: true,
      authIdentity: 'github.com:cheng:two',
    })

    expect(authTwoCacheAfterEviction).not.toBe(authTwoCache)
    expect(authTwoCacheAfterEviction.repositoryVariablesByRepository.size).toBe(
      0,
    )
  })
})

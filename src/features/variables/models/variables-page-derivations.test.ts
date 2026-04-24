import { describe, expect, it } from 'vitest'
import {
  createEnvironmentOptions,
  createRepositoryOptions,
  createSelectionState,
  filterGlobalResultsForRepository,
  filterSettingsEntries,
  getCurrentEntriesForScope,
  hasLoadedEntriesForScope,
  resolveSelectedEnvironment,
  resolveSelectedRepository,
  sortFilteredEntries,
} from './variables-page-derivations'

describe('variables-page-derivations', () => {
  it('resolves repository from search when available', () => {
    expect(
      resolveSelectedRepository({
        initialRepository: 'cheng/fallback',
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
        searchRepository: 'cheng/foo',
      }),
    ).toBe('cheng/foo')
  })

  it('prefers a populated environment for environment variables', () => {
    expect(
      resolveSelectedEnvironment({
        activeScope: 'environment-variables',
        environments: [
          {
            createdAt: '2026-04-20T00:00:00Z',
            htmlUrl: 'https://github.com/cheng/foo/environments/preview',
            name: 'preview',
            protectionRulesCount: 0,
            updatedAt: '2026-04-20T00:00:00Z',
            variableCount: 0,
          },
          {
            createdAt: '2026-04-20T00:00:00Z',
            htmlUrl: 'https://github.com/cheng/foo/environments/production',
            name: 'production',
            protectionRulesCount: 0,
            updatedAt: '2026-04-20T00:00:00Z',
            variableCount: 2,
          },
        ],
        environmentsRepository: 'cheng/foo',
        selectedRepository: 'cheng/foo',
      }),
    ).toBe('production')
  })

  it('filters and sorts entries using shared derivation helpers', () => {
    const entries = filterSettingsEntries({
      currentEntries: [
        { name: 'BETA', updatedAt: '2026-04-20T00:00:00Z', value: '2' },
        { name: 'ALPHA', updatedAt: '2026-04-21T00:00:00Z', value: '1' },
      ],
      query: 'a',
    })

    const sorted = sortFilteredEntries({
      activeScope: 'repository-variables',
      collator: new Intl.Collator('en', { numeric: true, sensitivity: 'base' }),
      direction: 'asc',
      entries,
      field: 'name',
    })

    expect(sorted.map((entry) => entry.name)).toEqual(['ALPHA', 'BETA'])
  })

  it('filters global results by selected repository and query', () => {
    expect(
      filterGlobalResultsForRepository({
        globalSearchRepository: 'cheng/foo',
        query: 'api',
        results: [
          {
            id: 'one',
            name: 'API_URL',
            repository: 'cheng/foo',
            scope: 'repository-variables',
            searchText: 'api_url\nhttps://example.com',
            updatedAt: '2026-04-20T00:00:00Z',
            value: 'https://example.com',
          },
          {
            id: 'two',
            name: 'TOKEN',
            repository: 'cheng/bar',
            scope: 'repository-secrets',
            searchText: 'token',
            updatedAt: '2026-04-20T00:00:00Z',
          },
        ],
        selectedRepository: 'cheng/foo',
      }).map((entry) => entry.id),
    ).toEqual(['one'])
  })

  it('builds options, scope entries, and selection state', () => {
    expect(
      createRepositoryOptions([
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
      ]),
    ).toEqual(['cheng/foo'])

    expect(
      createEnvironmentOptions({
        emptyOptionLabel: '(empty)',
        environments: [
          {
            createdAt: '2026-04-20T00:00:00Z',
            htmlUrl: 'https://github.com/cheng/foo/environments/preview',
            name: 'preview',
            protectionRulesCount: 0,
            updatedAt: '2026-04-20T00:00:00Z',
            variableCount: 0,
          },
          {
            createdAt: '2026-04-20T00:00:00Z',
            htmlUrl: 'https://github.com/cheng/foo/environments/production',
            name: 'production',
            protectionRulesCount: 0,
            updatedAt: '2026-04-20T00:00:00Z',
            variableCount: 2,
          },
          {
            createdAt: '2026-04-20T00:00:00Z',
            htmlUrl: 'https://github.com/cheng/foo/environments/staging',
            name: 'staging',
            protectionRulesCount: 0,
            updatedAt: '2026-04-20T00:00:00Z',
            variableCount: 0,
          },
        ],
      }),
    ).toEqual([
      { label: 'production', value: 'production' },
      { label: 'preview (empty)', value: 'preview' },
      { label: 'staging (empty)', value: 'staging' },
    ])

    expect(
      getCurrentEntriesForScope({
        activeScope: 'repository-variables',
        environmentSecrets: [],
        environmentVariables: [],
        repositorySecrets: [],
        repositoryVariables: [
          {
            createdAt: '2026-04-19T00:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-20T00:00:00Z',
            value: 'x',
          },
        ],
      }),
    ).toEqual([
      {
        createdAt: '2026-04-19T00:00:00Z',
        name: 'API_URL',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'x',
      },
    ])

    expect(
      createSelectionState({
        filteredEntries: [
          { name: 'API_URL', updatedAt: '2026-04-20T00:00:00Z' },
          { name: 'TOKEN', updatedAt: '2026-04-20T00:00:00Z' },
        ],
        selectedEntryNames: ['API_URL'],
      }),
    ).toMatchObject({
      allFilteredEntriesSelected: false,
      hasPartiallySelectedEntries: true,
      hasSelectedEntries: true,
    })
  })

  it('matches loaded entries to the selected scope target', () => {
    expect(
      hasLoadedEntriesForScope({
        activeScope: 'repository-variables',
        environmentSecretsKey: 'cheng/foo:production',
        environmentVariablesKey: 'cheng/foo:production',
        repositorySecretsRepository: 'cheng/foo',
        repositoryVariablesRepository: 'cheng/foo',
        selectedEnvironment: 'production',
        selectedRepository: 'cheng/foo',
      }),
    ).toBe(true)

    expect(
      hasLoadedEntriesForScope({
        activeScope: 'repository-secrets',
        environmentSecretsKey: 'cheng/foo:production',
        environmentVariablesKey: 'cheng/foo:production',
        repositorySecretsRepository: 'cheng/bar',
        repositoryVariablesRepository: 'cheng/foo',
        selectedEnvironment: 'production',
        selectedRepository: 'cheng/foo',
      }),
    ).toBe(false)

    expect(
      hasLoadedEntriesForScope({
        activeScope: 'environment-variables',
        environmentSecretsKey: 'cheng/foo:staging',
        environmentVariablesKey: 'cheng/foo:production',
        repositorySecretsRepository: 'cheng/foo',
        repositoryVariablesRepository: 'cheng/foo',
        selectedEnvironment: 'production',
        selectedRepository: 'cheng/foo',
      }),
    ).toBe(true)

    expect(
      hasLoadedEntriesForScope({
        activeScope: 'environment-secrets',
        environmentSecretsKey: 'cheng/foo:staging',
        environmentVariablesKey: 'cheng/foo:production',
        repositorySecretsRepository: 'cheng/foo',
        repositoryVariablesRepository: 'cheng/foo',
        selectedEnvironment: 'production',
        selectedRepository: 'cheng/foo',
      }),
    ).toBe(false)
  })
})

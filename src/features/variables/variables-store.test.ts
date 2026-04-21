import { describe, expect, it } from 'vitest'
import {
  createVariablesStore,
  createVariablesStoreInitialState,
} from './variables-store'
import type { VariablesLoaderData } from './variables-types'

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
      cliLoginCommand: 'ghdeck login',
      ghInstalled: true,
      ghLoginCommand: 'gh auth login --web',
      installUrl: 'https://cli.github.com',
      issues: [],
      knownAccounts: [],
      statusCommand: 'gh auth status --json hosts',
    },
  }
}

describe('createVariablesStoreInitialState', () => {
  it('prefers the cached snapshot over fresh loader data', () => {
    const loaderData = createLoaderData()
    const initialState = createVariablesStoreInitialState({
      initialDataSnapshot: {
        environmentSecrets: [],
        environmentSecretsKey: '',
        environmentVariables: [],
        environmentVariablesKey: '',
        environments: [],
        environmentsRepository: '',
        initialRepository: 'cheng/bar',
        repositories: loaderData.repositories,
        repositorySecrets: [],
        repositorySecretsRepository: '',
        repositoryVariables: [
          {
            createdAt: '2026-04-18T00:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-18T00:00:00Z',
            value: 'https://cached.example.com',
          },
        ],
        repositoryVariablesRepository: 'cheng/bar',
      },
      loaderData,
    })

    expect(initialState.repositoryVariablesRepository).toBe('cheng/bar')
    expect(initialState.repositoryVariables[0]?.value).toBe(
      'https://cached.example.com',
    )
  })
})

describe('createVariablesStore', () => {
  it('closes the entry editor and clears its draft state', () => {
    const store = createVariablesStore(
      createVariablesStoreInitialState({
        initialDataSnapshot: null,
        loaderData: createLoaderData(),
      }),
    )

    store.getState().setEditingEntryName('API_URL')
    store.getState().setName('API_URL')
    store.getState().setValue('https://draft.example.com')
    store.getState().setBulkInput('FOO=bar')
    store.getState().setBulkInputError('Invalid input')
    store.getState().setEntryEditorContext({
      environmentName: '',
      repository: 'cheng/foo',
      scope: 'repository-variables',
    })
    store.getState().setIsEntryEditorOpen(true)
    store.getState().setShouldRestoreGlobalSearchAfterEditorClose(true)

    store.getState().closeEntryEditorImmediately()

    expect(store.getState().editingEntryName).toBeNull()
    expect(store.getState().name).toBe('')
    expect(store.getState().value).toBe('')
    expect(store.getState().bulkInput).toBe('')
    expect(store.getState().bulkInputError).toBeNull()
    expect(store.getState().entryEditorContext).toBeNull()
    expect(store.getState().isEntryEditorOpen).toBe(false)
    expect(store.getState().shouldRestoreGlobalSearchAfterEditorClose).toBe(
      false,
    )
  })

  it('resets repository-scoped cached data and search results together', () => {
    const store = createVariablesStore(
      createVariablesStoreInitialState({
        initialDataSnapshot: null,
        loaderData: createLoaderData(),
      }),
    )

    store.getState().setGlobalSearchQuery('API')
    store.getState().setGlobalSearchError('Search failed')
    store.getState().setGlobalSearchRepository('cheng/foo')
    store.getState().setRepositorySecretsRepository('cheng/foo')
    store.getState().setEnvironmentVariablesKey('cheng/foo:preview')

    store.getState().resetRepositoryScopedData()

    expect(store.getState().globalSearchQuery).toBe('')
    expect(store.getState().globalSearchError).toBeNull()
    expect(store.getState().globalSearchRepository).toBe('')
    expect(store.getState().repositorySecretsRepository).toBe('')
    expect(store.getState().environmentVariablesKey).toBe('')
  })
})

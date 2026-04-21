import { describe, expect, it } from 'vitest'
import {
  createVariablesStore,
  createVariablesStoreInitialState,
} from './variables-store'
import { openGlobalSearchResultInEditor } from './variables-global-search'
import type { VariablesLoaderData } from './variables-types'

function createLoaderData(): VariablesLoaderData {
  return {
    environmentSecrets: [
      {
        name: 'COPILOT_SECRET',
        updatedAt: '2026-04-20T00:00:00Z',
        visibility: 'private',
      },
    ],
    environmentSecretsKey: 'cheng/foo:copilot',
    environmentVariables: [],
    environmentVariablesKey: '',
    environments: [
      {
        createdAt: '2026-04-19T00:00:00Z',
        htmlUrl: 'https://github.com/cheng/foo/environments/copilot',
        name: 'copilot',
        protectionRulesCount: 0,
        updatedAt: '2026-04-20T00:00:00Z',
        variableCount: 1,
      },
      {
        createdAt: '2026-04-19T00:00:00Z',
        htmlUrl: 'https://github.com/cheng/foo/environments/production',
        name: 'production',
        protectionRulesCount: 0,
        updatedAt: '2026-04-20T00:00:00Z',
        variableCount: 0,
      },
    ],
    environmentsRepository: 'cheng/foo',
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
        name: 'ADMIN_PAGES_PROJECT',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'stream-danmaku-admin',
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

describe('openGlobalSearchResultInEditor', () => {
  it('opens the editor with the selected result context and payload', () => {
    const store = createVariablesStore(
      createVariablesStoreInitialState({
        initialDataSnapshot: null,
        loaderData: createLoaderData(),
      }),
    )

    store.getState().setIsGlobalSearchDialogOpen(true)
    store.getState().setGlobalSearchQuery('admin')

    openGlobalSearchResultInEditor(store.getState(), {
      id: 'cheng/foo:repository-variables:ADMIN_PAGES_PROJECT',
      name: 'ADMIN_PAGES_PROJECT',
      repository: 'cheng/foo',
      scope: 'repository-variables',
      searchText: 'ADMIN_PAGES_PROJECT stream-danmaku-admin',
      updatedAt: '2026-04-20T00:00:00Z',
      value: 'stream-danmaku-admin',
    })

    expect(store.getState().isEntryEditorOpen).toBe(true)
    expect(store.getState().isGlobalSearchDialogOpen).toBe(false)
    expect(store.getState().editingEntryName).toBe('ADMIN_PAGES_PROJECT')
    expect(store.getState().name).toBe('ADMIN_PAGES_PROJECT')
    expect(store.getState().value).toBe('stream-danmaku-admin')
    expect(store.getState().entryEditorContext).toEqual({
      environmentName: '',
      repository: 'cheng/foo',
      scope: 'repository-variables',
    })
    expect(store.getState().shouldRestoreGlobalSearchAfterEditorClose).toBe(
      true,
    )
  })

  it('does not mutate the current background target state when opening a search result', () => {
    const store = createVariablesStore(
      createVariablesStoreInitialState({
        initialDataSnapshot: null,
        loaderData: createLoaderData(),
      }),
    )

    const backgroundStateBefore = {
      environmentSecretsKey: store.getState().environmentSecretsKey,
      environmentsRepository: store.getState().environmentsRepository,
      repositoryVariablesRepository:
        store.getState().repositoryVariablesRepository,
    }

    openGlobalSearchResultInEditor(store.getState(), {
      environmentName: 'production',
      id: 'cheng/foo:environment-variables:ADMIN_URL:production',
      name: 'ADMIN_URL',
      repository: 'cheng/foo',
      scope: 'environment-variables',
      searchText: 'ADMIN_URL https://admin.example.com production',
      updatedAt: '2026-04-21T08:12:00Z',
      value: 'https://admin.example.com',
    })

    expect(store.getState().entryEditorContext).toEqual({
      environmentName: 'production',
      repository: 'cheng/foo',
      scope: 'environment-variables',
    })
    expect(store.getState().environmentSecretsKey).toBe(
      backgroundStateBefore.environmentSecretsKey,
    )
    expect(store.getState().environmentsRepository).toBe(
      backgroundStateBefore.environmentsRepository,
    )
    expect(store.getState().repositoryVariablesRepository).toBe(
      backgroundStateBefore.repositoryVariablesRepository,
    )
  })
})

import { describe, expect, it } from 'vitest'
import {
  createVariablesStore,
  createVariablesStoreInitialState,
} from './variables-store'
import {
  openEntryEditorForScope,
  requestCloseEntryEditor,
  startCreateEntryEditor,
} from './variables-entry-editor'
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

function createStore() {
  return createVariablesStore(
    createVariablesStoreInitialState({
      initialDataSnapshot: null,
      loaderData: createLoaderData(),
    }),
  )
}

describe('variables entry editor interactions', () => {
  it('starts create entry editor in the current view context and disables search restore', () => {
    const store = createStore()

    store.getState().setBulkInput('FOO=bar')
    store.getState().setIsGlobalSearchDialogOpen(true)
    store.getState().setShouldRestoreGlobalSearchAfterEditorClose(true)

    startCreateEntryEditor(store.getState(), {
      activeScope: 'environment-secrets',
      selectedEnvironment: 'copilot',
      selectedRepository: 'cheng/foo',
    })

    expect(store.getState().bulkInput).toBe('')
    expect(store.getState().entryEditorContext).toEqual({
      environmentName: 'copilot',
      repository: 'cheng/foo',
      scope: 'environment-secrets',
    })
    expect(store.getState().shouldRestoreGlobalSearchAfterEditorClose).toBe(
      false,
    )
    expect(store.getState().isGlobalSearchDialogOpen).toBe(false)
    expect(store.getState().isEntryEditorOpen).toBe(true)
  })

  it('opens edit mode in the active scope with the current target context', () => {
    const store = createStore()

    openEntryEditorForScope(store.getState(), {
      activeScope: 'environment-secrets',
      entry: {
        name: 'COPILOT_SECRET',
        updatedAt: '2026-04-20T00:00:00Z',
      },
      isGlobalSearchDialogOpen: false,
      scope: 'environment-secrets',
      selectedEnvironment: 'copilot',
      selectedRepository: 'cheng/foo',
    })

    expect(store.getState().entryEditorContext).toEqual({
      environmentName: 'copilot',
      repository: 'cheng/foo',
      scope: 'environment-secrets',
    })
    expect(store.getState().editingEntryName).toBe('COPILOT_SECRET')
    expect(store.getState().name).toBe('COPILOT_SECRET')
    expect(store.getState().shouldRestoreGlobalSearchAfterEditorClose).toBe(
      false,
    )
  })

  it('opens edit mode for a different scope without mutating the background target context', () => {
    const store = createStore()
    const backgroundStateBefore = {
      environmentSecretsKey: store.getState().environmentSecretsKey,
      environmentsRepository: store.getState().environmentsRepository,
    }

    openEntryEditorForScope(store.getState(), {
      activeScope: 'environment-secrets',
      entry: {
        name: 'ADMIN_PAGES_PROJECT',
        updatedAt: '2026-04-20T00:00:00Z',
        value: 'stream-danmaku-admin',
      },
      isGlobalSearchDialogOpen: true,
      scope: 'repository-variables',
      selectedEnvironment: 'copilot',
      selectedRepository: 'cheng/foo',
    })

    expect(store.getState().entryEditorContext).toEqual({
      environmentName: '',
      repository: '',
      scope: 'repository-variables',
    })
    expect(store.getState().shouldRestoreGlobalSearchAfterEditorClose).toBe(
      true,
    )
    expect(store.getState().environmentSecretsKey).toBe(
      backgroundStateBefore.environmentSecretsKey,
    )
    expect(store.getState().environmentsRepository).toBe(
      backgroundStateBefore.environmentsRepository,
    )
  })

  it('reopens global search when closing an editor launched from global search', () => {
    const store = createStore()

    store.getState().setIsEntryEditorOpen(true)
    store.getState().setEntryEditorContext({
      environmentName: '',
      repository: 'cheng/foo',
      scope: 'repository-variables',
    })
    store.getState().setShouldRestoreGlobalSearchAfterEditorClose(true)
    store.getState().setGlobalSearchQuery('admin')

    requestCloseEntryEditor(store.getState(), {
      isEntryEditorOpen: true,
      shouldRestoreGlobalSearchAfterEditorClose:
        store.getState().shouldRestoreGlobalSearchAfterEditorClose,
      trimmedGlobalSearchQuery: store.getState().globalSearchQuery.trim(),
    })

    expect(store.getState().isEntryEditorOpen).toBe(false)
    expect(store.getState().entryEditorContext).toBeNull()
    expect(store.getState().isGlobalSearchDialogOpen).toBe(true)
  })

  it('does not reopen global search when the editor was not launched from search', () => {
    const store = createStore()

    store.getState().setIsEntryEditorOpen(true)
    store.getState().setIsGlobalSearchDialogOpen(false)

    requestCloseEntryEditor(store.getState(), {
      isEntryEditorOpen: true,
      shouldRestoreGlobalSearchAfterEditorClose: false,
      trimmedGlobalSearchQuery: 'admin',
    })

    expect(store.getState().isEntryEditorOpen).toBe(false)
    expect(store.getState().isGlobalSearchDialogOpen).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { CLI_LOGIN_COMMAND } from '#/lib/product'
import {
  createVariablesStore,
  createVariablesStoreInitialState,
} from '#/features/variables/state/variables-store'
import {
  applyEnvironmentViewChange,
  applyRepositoryViewChange,
  applyScopeViewChange,
} from './variables-view-switch'
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
        htmlUrl: 'https://github.com/cheng/foo/environments/preview',
        name: 'preview',
        protectionRulesCount: 0,
        secretCount: 1,
        updatedAt: '2026-04-20T00:00:00Z',
        variableCount: 0,
      },
      {
        createdAt: '2026-04-19T00:00:00Z',
        htmlUrl: 'https://github.com/cheng/foo/environments/copilot',
        name: 'copilot',
        protectionRulesCount: 0,
        secretCount: 0,
        updatedAt: '2026-04-20T00:00:00Z',
        variableCount: 1,
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

function createStore() {
  return createVariablesStore(
    createVariablesStoreInitialState({
      initialDataSnapshot: null,
      loaderData: createLoaderData(),
    }),
  )
}

describe('variables view switching', () => {
  it('resets repository-scoped ui state and search when changing repository', async () => {
    const store = createStore()
    const updateVariablesSearch = vi.fn().mockResolvedValue(undefined)
    const abortAllManagedRequests = vi.fn()

    store.getState().setRepositoryError('repo error')
    store.getState().setEnvironmentSelectionError('env error')
    store.getState().setEnvironmentName('staging')
    store.getState().setEnvironmentNameError('bad name')
    store.getState().setIsEnvironmentCreateOpen(true)
    store.getState().setEntryEditorContext({
      environmentName: 'copilot',
      repository: 'cheng/foo',
      scope: 'environment-secrets',
    })
    store.getState().setIsEntryEditorOpen(true)
    store.getState().setIsEnvironmentEditing(true)
    store.getState().setIsTableEditing(true)
    store.getState().setGlobalSearchQuery('admin')
    store.getState().setGlobalSearchRepository('cheng/foo')

    await applyRepositoryViewChange(
      store.getState(),
      {
        abortAllManagedRequests,
        selectedRepository: 'cheng/foo',
        updateVariablesSearch,
      },
      'cheng/bar',
    )

    expect(abortAllManagedRequests).toHaveBeenCalledOnce()
    expect(store.getState().repositoryError).toBeNull()
    expect(store.getState().environmentSelectionError).toBeNull()
    expect(store.getState().isEnvironmentCreateOpen).toBe(false)
    expect(store.getState().environmentName).toBe('')
    expect(store.getState().isEntryEditorOpen).toBe(false)
    expect(store.getState().isEnvironmentEditing).toBe(false)
    expect(store.getState().isTableEditing).toBe(false)
    expect(store.getState().globalSearchQuery).toBe('')
    expect(store.getState().globalSearchRepository).toBe('')
    expect(updateVariablesSearch).toHaveBeenCalledWith({
      environment: undefined,
      query: undefined,
      repository: 'cheng/bar',
      tab: 'single',
    })
  })

  it('clears environment search context when switching from environment scope to repository scope', async () => {
    const store = createStore()
    const updateVariablesSearch = vi.fn().mockResolvedValue(undefined)
    const abortAllManagedRequests = vi.fn()

    store.getState().setIsEnvironmentCreateOpen(true)
    store.getState().setIsEntryEditorOpen(true)
    store.getState().setIsEnvironmentEditing(true)
    store.getState().setIsTableEditing(true)

    await applyScopeViewChange(
      store.getState(),
      {
        abortAllManagedRequests,
        activeScope: 'environment-secrets',
        updateVariablesSearch,
      },
      'repository-variables',
    )

    expect(abortAllManagedRequests).toHaveBeenCalledOnce()
    expect(store.getState().isEnvironmentCreateOpen).toBe(false)
    expect(store.getState().isEntryEditorOpen).toBe(false)
    expect(store.getState().isEnvironmentEditing).toBe(false)
    expect(store.getState().isTableEditing).toBe(false)
    expect(updateVariablesSearch).toHaveBeenCalledWith({
      environment: undefined,
      query: undefined,
      scope: 'repository-variables',
      tab: 'single',
    })
  })

  it('preserves environment search key when switching between environment scopes', async () => {
    const store = createStore()
    const updateVariablesSearch = vi.fn().mockResolvedValue(undefined)

    await applyScopeViewChange(
      store.getState(),
      {
        abortAllManagedRequests: vi.fn(),
        activeScope: 'environment-secrets',
        preserveEnvironmentOnScopeSwitch: true,
        updateVariablesSearch,
      },
      'environment-variables',
    )

    expect(updateVariablesSearch).toHaveBeenCalledWith({
      query: undefined,
      scope: 'environment-variables',
      tab: 'single',
    })
  })

  it('clears the carried environment when switching to environment variables and the current environment has no variables', async () => {
    const store = createStore()
    const updateVariablesSearch = vi.fn().mockResolvedValue(undefined)

    await applyScopeViewChange(
      store.getState(),
      {
        abortAllManagedRequests: vi.fn(),
        activeScope: 'environment-secrets',
        preserveEnvironmentOnScopeSwitch: false,
        updateVariablesSearch,
      },
      'environment-variables',
    )

    expect(updateVariablesSearch).toHaveBeenCalledWith({
      environment: undefined,
      query: undefined,
      scope: 'environment-variables',
      tab: 'single',
    })
  })

  it('clears environment error, closes the editor, and resets the query when changing environment', async () => {
    const store = createStore()
    const updateVariablesSearch = vi.fn().mockResolvedValue(undefined)

    store.getState().setEnvironmentSelectionError('pick one')
    store.getState().setEntryEditorContext({
      environmentName: 'copilot',
      repository: 'cheng/foo',
      scope: 'environment-secrets',
    })
    store.getState().setIsEntryEditorOpen(true)
    store.getState().setIsTableEditing(true)

    await applyEnvironmentViewChange(
      store.getState(),
      {
        selectedEnvironment: 'copilot',
        updateVariablesSearch,
      },
      'production',
    )

    expect(store.getState().environmentSelectionError).toBeNull()
    expect(store.getState().isEntryEditorOpen).toBe(false)
    expect(store.getState().entryEditorContext).toBeNull()
    expect(store.getState().isTableEditing).toBe(false)
    expect(updateVariablesSearch).toHaveBeenCalledWith({
      environment: 'production',
      query: undefined,
    })
  })

  it('does nothing when the requested repository, scope, or environment is unchanged', async () => {
    const store = createStore()
    const updateVariablesSearch = vi.fn().mockResolvedValue(undefined)
    const abortAllManagedRequests = vi.fn()

    await applyRepositoryViewChange(
      store.getState(),
      {
        abortAllManagedRequests,
        selectedRepository: 'cheng/foo',
        updateVariablesSearch,
      },
      'cheng/foo',
    )
    await applyScopeViewChange(
      store.getState(),
      {
        abortAllManagedRequests,
        activeScope: 'environment-secrets',
        updateVariablesSearch,
      },
      'environment-secrets',
    )
    await applyEnvironmentViewChange(
      store.getState(),
      {
        selectedEnvironment: 'copilot',
        updateVariablesSearch,
      },
      'copilot',
    )

    expect(abortAllManagedRequests).not.toHaveBeenCalled()
    expect(updateVariablesSearch).not.toHaveBeenCalled()
  })
})

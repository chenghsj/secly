import { describe, expect, it, vi } from 'vitest'
import {
  deleteRepositoryVariable,
  listManageableRepositories,
  listRepositoryVariables,
  upsertRepositoryVariable,
} from './gh-repository-variables.server'
import type { GhAuthStatus } from './gh-auth.server'

function createStatus(overrides?: Partial<GhAuthStatus>): GhAuthStatus {
  return {
    activeAccount: {
      active: true,
      gitProtocol: 'https',
      host: 'github.com',
      login: 'chenghsj',
      scopes: ['repo', 'workflow'],
      state: 'success',
      tokenSource: 'keyring',
    },
    authenticated: true,
    cliLoginCommand: 'ghdeck login',
    ghInstalled: true,
    ghLoginCommand:
      'gh auth login --hostname github.com --web --git-protocol https --skip-ssh-key --scopes workflow',
    installUrl: 'https://cli.github.com',
    issues: [],
    knownAccounts: [],
    statusCommand: 'gh auth status --json hosts',
    ...overrides,
  }
}

describe('listManageableRepositories', () => {
  it('flattens slurped repo pages and keeps repos with write access', async () => {
    const repositories = await listManageableRepositories({
      execRunner: async () => ({
        stderr: '',
        stdout: JSON.stringify([
          [
            {
              full_name: 'cheng/foo',
              html_url: 'https://github.com/cheng/foo',
              name: 'foo',
              owner: { login: 'cheng' },
              permissions: { admin: false, maintain: false, push: true },
              private: false,
              updated_at: '2026-04-18T12:00:00Z',
              visibility: 'public',
            },
          ],
          [
            {
              full_name: 'cheng/bar',
              html_url: 'https://github.com/cheng/bar',
              name: 'bar',
              owner: { login: 'cheng' },
              permissions: { admin: false, maintain: false, push: false },
              private: true,
              updated_at: '2026-04-19T12:00:00Z',
              visibility: 'private',
            },
          ],
        ]),
      }),
      status: createStatus(),
    })

    expect(repositories).toEqual([
      expect.objectContaining({
        canManageVariables: true,
        nameWithOwner: 'cheng/foo',
      }),
    ])
  })
})

describe('listRepositoryVariables', () => {
  it('parses repo variable responses', async () => {
    const variables = await listRepositoryVariables('cheng/foo', {
      execRunner: async () => ({
        stderr: '',
        stdout: JSON.stringify({
          total_count: 2,
          variables: [
            {
              created_at: '2026-04-18T12:00:00Z',
              name: 'API_URL',
              updated_at: '2026-04-18T12:00:00Z',
              value: 'https://example.com',
            },
            {
              created_at: '2026-04-19T12:00:00Z',
              name: 'FEATURE_FLAG',
              updated_at: '2026-04-19T12:00:00Z',
              value: 'true',
            },
          ],
        }),
      }),
      status: createStatus(),
    })

    expect(variables.map((variable) => variable.name)).toEqual([
      'API_URL',
      'FEATURE_FLAG',
    ])
  })
})

describe('upsertRepositoryVariable', () => {
  it('creates a missing variable and reads it back', async () => {
    const execRunner = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('not found'), {
          stderr: 'HTTP 404: Not Found',
        }),
      )
      .mockResolvedValueOnce({ stderr: '', stdout: '' })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({
          created_at: '2026-04-19T12:00:00Z',
          name: 'API_URL',
          updated_at: '2026-04-19T12:00:00Z',
          value: 'https://example.com',
        }),
      })

    const result = await upsertRepositoryVariable(
      'cheng/foo',
      'API_URL',
      'https://example.com',
      {
        execRunner,
        status: createStatus(),
      },
    )

    expect(result.created).toBe(true)
    expect(execRunner).toHaveBeenNthCalledWith(
      2,
      'gh',
      expect.arrayContaining([
        '--method',
        'POST',
        '/repos/cheng/foo/actions/variables',
      ]),
    )
  })

  it('updates an existing variable', async () => {
    const execRunner = vi
      .fn()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({
          created_at: '2026-04-18T12:00:00Z',
          name: 'API_URL',
          updated_at: '2026-04-18T12:00:00Z',
          value: 'https://old.example.com',
        }),
      })
      .mockResolvedValueOnce({ stderr: '', stdout: '' })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({
          created_at: '2026-04-18T12:00:00Z',
          name: 'API_URL',
          updated_at: '2026-04-19T12:00:00Z',
          value: 'https://new.example.com',
        }),
      })

    const result = await upsertRepositoryVariable(
      'cheng/foo',
      'API_URL',
      'https://new.example.com',
      {
        execRunner,
        status: createStatus(),
      },
    )

    expect(result.created).toBe(false)
    expect(execRunner).toHaveBeenNthCalledWith(
      2,
      'gh',
      expect.arrayContaining([
        '--method',
        'PATCH',
        '/repos/cheng/foo/actions/variables/API_URL',
      ]),
    )
  })
})

describe('deleteRepositoryVariable', () => {
  it('deletes a variable through gh api', async () => {
    const execRunner = vi.fn().mockResolvedValue({ stderr: '', stdout: '' })

    await deleteRepositoryVariable('cheng/foo', 'API_URL', {
      execRunner,
      status: createStatus(),
    })

    expect(execRunner).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining([
        '--method',
        'DELETE',
        '/repos/cheng/foo/actions/variables/API_URL',
      ]),
    )
  })
})

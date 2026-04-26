import { describe, expect, it, vi } from 'vitest'
import { CLI_LOGIN_COMMAND } from '../lib/product'
import {
  createRepositoryEnvironment,
  deleteEnvironmentSecret,
  deleteRepositoryEnvironment,
  listEnvironmentVariables,
  listRepositoryEnvironments,
  listRepositorySecrets,
  upsertEnvironmentSecret,
  upsertEnvironmentVariable,
  upsertRepositorySecret,
} from './gh-actions-settings.server'
import type { GhAuthStatus } from './gh-auth.server'

vi.mock('#/server/db/client', () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(() => ({ where: vi.fn(() => ({ run: vi.fn() })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ run: vi.fn() })) })),
  },
}))

vi.mock('#/server/db/lock-utils', () => ({
  mergeLocksAndGarbageCollect: vi.fn((items) =>
    items.map((entry: any) => ({ ...entry, isLocked: false })),
  ),
}))

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
    cliLoginCommand: CLI_LOGIN_COMMAND,
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

describe('listRepositorySecrets', () => {
  it('parses repository secret metadata from gh secret list', async () => {
    const secrets = await listRepositorySecrets('cheng/foo', {
      execRunner: async () => ({
        stderr: '',
        stdout: JSON.stringify([
          {
            name: 'API_KEY',
            updatedAt: '2026-04-19T12:00:00Z',
            visibility: 'private',
          },
          {
            name: 'WEBHOOK_SECRET',
            updatedAt: '2026-04-18T12:00:00Z',
            visibility: 'private',
          },
        ]),
      }),
      status: createStatus(),
    })

    expect(secrets.map((secret) => secret.name)).toEqual([
      'API_KEY',
      'WEBHOOK_SECRET',
    ])
  })

  it('forwards an abort signal to the gh exec runner', async () => {
    const signal = new AbortController().signal
    const execRunner = vi.fn().mockResolvedValue({
      stderr: '',
      stdout: JSON.stringify([]),
    })

    await listRepositorySecrets('cheng/foo', {
      execRunner,
      signal,
      status: createStatus(),
    })

    expect(execRunner).toHaveBeenCalledWith(
      'gh',
      expect.any(Array),
      expect.objectContaining({ signal }),
    )
  })
})

describe('upsertRepositorySecret', () => {
  it('creates a missing secret and reads the metadata back', async () => {
    const execRunner = vi
      .fn()
      .mockResolvedValueOnce({ stderr: '', stdout: JSON.stringify([]) })
      .mockResolvedValueOnce({ stderr: '', stdout: '' })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([
          {
            name: 'API_KEY',
            updatedAt: '2026-04-19T12:00:00Z',
            visibility: 'private',
          },
        ]),
      })

    const result = await upsertRepositorySecret('cheng/foo', 'API_KEY', 'abc', {
      execRunner,
      status: createStatus(),
    })

    expect(result.created).toBe(true)
    expect(execRunner).toHaveBeenNthCalledWith(
      2,
      'gh',
      expect.arrayContaining([
        'secret',
        'set',
        'API_KEY',
        '--repo',
        'cheng/foo',
      ]),
    )
  })

  it('falls back to local metadata when the secret list has not caught up yet', async () => {
    const execRunner = vi
      .fn()
      .mockResolvedValueOnce({ stderr: '', stdout: JSON.stringify([]) })
      .mockResolvedValueOnce({ stderr: '', stdout: '' })
      .mockResolvedValue({ stderr: '', stdout: JSON.stringify([]) })

    const result = await upsertRepositorySecret('cheng/foo', 'API_KEY', 'abc', {
      execRunner,
      status: createStatus(),
    })

    expect(result).toEqual(
      expect.objectContaining({
        created: true,
        secret: expect.objectContaining({
          name: 'API_KEY',
          visibility: null,
        }),
      }),
    )
    expect(result.secret.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('upsertEnvironmentSecret', () => {
  it('sets an environment secret and returns fallback metadata if listing lags', async () => {
    const execRunner = vi
      .fn()
      .mockResolvedValueOnce({ stderr: '', stdout: JSON.stringify([]) })
      .mockResolvedValueOnce({ stderr: '', stdout: '' })
      .mockResolvedValue({ stderr: '', stdout: JSON.stringify([]) })

    const result = await upsertEnvironmentSecret(
      'cheng/foo',
      'preview',
      'API_KEY',
      'abc',
      {
        execRunner,
        status: createStatus(),
      },
    )

    expect(result.secret).toEqual(
      expect.objectContaining({
        name: 'API_KEY',
        visibility: null,
      }),
    )
    expect(execRunner).toHaveBeenNthCalledWith(
      2,
      'gh',
      expect.arrayContaining([
        'secret',
        'set',
        'API_KEY',
        '--repo',
        'cheng/foo',
        '--env',
        'preview',
      ]),
    )
  })
})

describe('listRepositoryEnvironments', () => {
  it('maps repository environments from the deployments API', async () => {
    const execRunner = vi
      .fn()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({
          environments: [
            {
              created_at: '2026-04-18T12:00:00Z',
              html_url:
                'https://github.com/cheng/foo/deployments/activity_log?environments_filter=preview',
              name: 'preview',
              protection_rules: [{ type: 'wait_timer' }],
              updated_at: '2026-04-19T12:00:00Z',
            },
          ],
          total_count: 1,
        }),
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([
          {
            createdAt: '2026-04-18T12:30:00Z',
            name: 'API_BASE_URL',
            updatedAt: '2026-04-19T12:30:00Z',
            value: 'https://example.com',
          },
        ]),
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([
          {
            name: 'API_TOKEN',
            updatedAt: '2026-04-19T12:45:00Z',
            visibility: 'private',
          },
        ]),
      })

    const environments = await listRepositoryEnvironments('cheng/foo', {
      execRunner,
      status: createStatus(),
    })

    expect(environments).toEqual([
      expect.objectContaining({
        name: 'preview',
        protectionRulesCount: 1,
        secretCount: 1,
        variableCount: 1,
      }),
    ])
  })
})

describe('createRepositoryEnvironment', () => {
  it('creates a new environment through the deployments API', async () => {
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
          html_url:
            'https://github.com/cheng/foo/deployments/activity_log?environments_filter=preview',
          name: 'preview',
          protection_rules: [],
          updated_at: '2026-04-19T12:00:00Z',
        }),
      })

    const environment = await createRepositoryEnvironment(
      'cheng/foo',
      'preview',
      {
        execRunner,
        status: createStatus(),
      },
    )

    expect(environment.name).toBe('preview')
    expect(execRunner).toHaveBeenNthCalledWith(
      2,
      'gh',
      expect.arrayContaining([
        '--method',
        'PUT',
        '/repos/cheng/foo/environments/preview',
      ]),
    )
  })

  it('surfaces a clear access error when GitHub rejects environment creation', async () => {
    const execRunner = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('not found'), {
          stderr: 'HTTP 404: Not Found',
        }),
      )
      .mockRejectedValueOnce(
        Object.assign(new Error('not found'), {
          stderr: 'HTTP 404: Not Found',
        }),
      )

    await expect(
      createRepositoryEnvironment('cheng/foo', 'preview', {
        execRunner,
        status: createStatus(),
      }),
    ).rejects.toThrow(
      'Creating and deleting environments requires repository owner or admin access',
    )
  })
})

describe('deleteRepositoryEnvironment', () => {
  it('deletes an environment through the deployments API', async () => {
    const execRunner = vi.fn().mockResolvedValue({ stderr: '', stdout: '' })

    await deleteRepositoryEnvironment('cheng/foo', 'preview', {
      execRunner,
      status: createStatus(),
    })

    expect(execRunner).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining([
        '--method',
        'DELETE',
        '/repos/cheng/foo/environments/preview',
      ]),
    )
  })
})

describe('listEnvironmentVariables', () => {
  it('parses environment variables from gh variable list --env', async () => {
    const variables = await listEnvironmentVariables('cheng/foo', 'preview', {
      execRunner: async () => ({
        stderr: '',
        stdout: JSON.stringify([
          {
            createdAt: '2026-04-18T12:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-19T12:00:00Z',
            value: 'https://example.com',
          },
        ]),
      }),
      status: createStatus(),
    })

    expect(variables[0]).toEqual(
      expect.objectContaining({
        name: 'API_URL',
        value: 'https://example.com',
      }),
    )
  })
})

describe('upsertEnvironmentVariable', () => {
  it('updates an existing environment variable', async () => {
    const execRunner = vi
      .fn()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([
          {
            createdAt: '2026-04-18T12:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-18T12:00:00Z',
            value: 'https://old.example.com',
          },
        ]),
      })
      .mockResolvedValueOnce({ stderr: '', stdout: '' })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([
          {
            createdAt: '2026-04-18T12:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-19T12:00:00Z',
            value: 'https://new.example.com',
          },
        ]),
      })

    const result = await upsertEnvironmentVariable(
      'cheng/foo',
      'preview',
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
        'variable',
        'set',
        'API_URL',
        '--repo',
        'cheng/foo',
        '--env',
        'preview',
      ]),
    )
  })

  it('retries environment variable read-back before returning fallback metadata', async () => {
    const execRunner = vi
      .fn()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([]),
      })
      .mockResolvedValueOnce({ stderr: '', stdout: '' })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([]),
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([]),
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([]),
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([]),
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify([]),
      })

    const before = Date.now()

    const result = await upsertEnvironmentVariable(
      'cheng/foo',
      'preview',
      'API_URL',
      'https://new.example.com',
      {
        execRunner,
        status: createStatus(),
      },
    )

    expect(result.created).toBe(true)
    expect(result.variable).toMatchObject({
      name: 'API_URL',
      value: 'https://new.example.com',
    })
    expect(Date.parse(result.variable.updatedAt)).toBeGreaterThanOrEqual(before)
    expect(execRunner).toHaveBeenCalledTimes(7)
  })
})

describe('deleteEnvironmentSecret', () => {
  it('deletes an environment secret through gh secret delete --env', async () => {
    const execRunner = vi.fn().mockResolvedValue({ stderr: '', stdout: '' })

    await deleteEnvironmentSecret('cheng/foo', 'preview', 'API_KEY', {
      execRunner,
      status: createStatus(),
    })

    expect(execRunner).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining([
        'secret',
        'delete',
        'API_KEY',
        '--repo',
        'cheng/foo',
        '--env',
        'preview',
      ]),
    )
  })
})

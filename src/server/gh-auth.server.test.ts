import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import { CLI_LOGIN_COMMAND } from '../lib/product'
import {
  buildLocalCliLoginCommand,
  cancelGhAuthLogin,
  getGhAuthStatus,
  logoutAllGhAuthAccounts,
  logoutGhAuthAccount,
  logoutCurrentGhAuthAccount,
  startGhAuthLogin,
  switchGhAuthAccount,
} from './gh-auth.server'

function createSpawnedGhProcess() {
  const stderr = new PassThrough()
  const stdout = new PassThrough()

  return Object.assign(new EventEmitter(), {
    kill: vi.fn(() => true),
    stderr,
    stdout,
    unref: vi.fn(),
  })
}

function createStatus(
  overrides?: Partial<Awaited<ReturnType<typeof getGhAuthStatus>>>,
) {
  return {
    activeAccount: null,
    authenticated: false,
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

describe('getGhAuthStatus', () => {
  it('parses the active local GitHub CLI session', async () => {
    const status = await getGhAuthStatus(async () => ({
      stderr: '',
      stdout: JSON.stringify({
        hosts: {
          'github.com': [
            {
              active: true,
              gitProtocol: 'https',
              host: 'github.com',
              login: 'chenghsj',
              scopes: 'gist, read:org, repo, workflow',
              state: 'success',
              tokenSource: 'keyring',
            },
          ],
        },
      }),
    }))

    expect(status.ghInstalled).toBe(true)
    expect(status.authenticated).toBe(true)
    expect(status.activeAccount?.login).toBe('chenghsj')
    expect(status.activeAccount?.scopes).toEqual([
      'gist',
      'read:org',
      'repo',
      'workflow',
    ])
    expect(status.issues).toEqual([])
  })

  it('reports when GitHub CLI is missing', async () => {
    const error = Object.assign(new Error('missing gh'), { code: 'ENOENT' })

    const status = await getGhAuthStatus(async () => {
      throw error
    })

    expect(status.ghInstalled).toBe(false)
    expect(status.authenticated).toBe(false)
    expect(status.issues[0]).toContain('GitHub CLI is not installed')
  })

  it('reports when there is no active GitHub CLI session', async () => {
    const status = await getGhAuthStatus(async () => ({
      stderr: '',
      stdout: JSON.stringify({ hosts: {} }),
    }))

    expect(status.ghInstalled).toBe(true)
    expect(status.authenticated).toBe(false)
    expect(status.activeAccount).toBeNull()
    expect(status.issues[0]).toContain('No active GitHub CLI session')
  })
})

describe('buildLocalCliLoginCommand', () => {
  it('quotes the repository path for Terminal handoff', () => {
    expect(buildLocalCliLoginCommand('/tmp/My Repo')).toBe(
      "cd '/tmp/My Repo' && npm run cli -- login",
    )
  })

  it('adds the CLI flag when launching another account login', () => {
    expect(
      buildLocalCliLoginCommand('/tmp/My Repo', { addAccount: true }),
    ).toBe("cd '/tmp/My Repo' && npm run cli -- login --add-account")
  })
})

describe('startGhAuthLogin', () => {
  it('returns noop when GitHub CLI is already authenticated', async () => {
    const spawnRunner = vi.fn(() => ({ unref: vi.fn() }))

    const result = await startGhAuthLogin({
      spawnRunner,
      status: createStatus({
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
      }),
    })

    expect(result.launched).toBe(false)
    expect(result.method).toBe('noop')
    expect(spawnRunner).not.toHaveBeenCalled()
  })

  it('can still launch login to add another account when already authenticated', async () => {
    const unref = vi.fn()
    const spawnRunner = vi.fn(() => ({ unref }))

    const result = await startGhAuthLogin({
      addAccount: true,
      platform: 'darwin',
      repoRootPath: '/tmp/My Repo',
      spawnRunner,
      status: createStatus({
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
      }),
    })

    expect(result.launched).toBe(true)
    expect(result.method).toBe('terminal')
    expect(result.command).toBe(
      "cd '/tmp/My Repo' && npm run cli -- login --add-account",
    )
    expect(spawnRunner).toHaveBeenCalled()
    expect(unref).toHaveBeenCalled()
  })

  it('opens Terminal on macOS when login is required', async () => {
    const unref = vi.fn()
    const spawnRunner = vi.fn(() => ({ unref }))

    const result = await startGhAuthLogin({
      platform: 'darwin',
      repoRootPath: '/tmp/My Repo',
      spawnRunner,
      status: createStatus(),
    })

    expect(result.launched).toBe(true)
    expect(result.method).toBe('terminal')
    expect(result.command).toBe("cd '/tmp/My Repo' && npm run cli -- login")
    expect(spawnRunner).toHaveBeenCalledWith(
      'osascript',
      expect.arrayContaining(['-e', 'tell application "Terminal" to activate']),
      expect.objectContaining({ detached: true, stdio: 'ignore' }),
    )
    expect(unref).toHaveBeenCalled()
  })

  it('captures the one-time code and verification URL for manual web login', async () => {
    const child = createSpawnedGhProcess()
    const spawnRunner = vi.fn(() => {
      queueMicrotask(() => {
        child.stderr.write('! First copy your one-time code: WDJB-MJHT\n')
        child.stderr.write(
          'Open this URL to continue in your web browser: https://github.com/login/device\n',
        )
      })

      return child
    })

    const result = await startGhAuthLogin({
      addAccount: true,
      presentation: 'manual-web',
      spawnRunner,
      status: createStatus({
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
      }),
    })

    expect(result.launched).toBe(true)
    expect(result.method).toBe('manual-web')
    expect(result.verificationCode).toBe('WDJB-MJHT')
    expect(result.verificationUrl).toBe('https://github.com/login/device')
    expect(spawnRunner).toHaveBeenCalledWith(
      'gh',
      [
        'auth',
        'login',
        '--hostname',
        'github.com',
        '--web',
        '--git-protocol',
        'https',
        '--skip-ssh-key',
        '--scopes',
        'workflow',
      ],
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    )

    child.emit('exit', 0)
  })

  it('cancels a pending manual web login', async () => {
    const child = createSpawnedGhProcess()
    const spawnRunner = vi.fn(() => {
      queueMicrotask(() => {
        child.stderr.write('! First copy your one-time code: WDJB-MJHT\n')
        child.stderr.write(
          'Open this URL to continue in your web browser: https://github.com/login/device\n',
        )
      })

      return child
    })

    await startGhAuthLogin({
      presentation: 'manual-web',
      spawnRunner,
      status: createStatus(),
    })

    const result = await cancelGhAuthLogin()

    expect(result.cancelled).toBe(true)
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('clears a pending manual web login after auth status changes', async () => {
    const child = createSpawnedGhProcess()
    const spawnRunner = vi.fn(() => {
      queueMicrotask(() => {
        child.stderr.write('! First copy your one-time code: WDJB-MJHT\n')
        child.stderr.write(
          'Open this URL to continue in your web browser: https://github.com/login/device\n',
        )
      })

      return child
    })

    await startGhAuthLogin({
      addAccount: true,
      presentation: 'manual-web',
      spawnRunner,
      status: createStatus({
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
        knownAccounts: [
          {
            active: true,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'chenghsj',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
        ],
      }),
    })

    const status = await getGhAuthStatus(async () => ({
      stderr: '',
      stdout: JSON.stringify({
        hosts: {
          'github.com': [
            {
              active: true,
              gitProtocol: 'https',
              host: 'github.com',
              login: 'chenghsj',
              scopes: 'repo, workflow',
              state: 'success',
              tokenSource: 'keyring',
            },
            {
              active: false,
              gitProtocol: 'https',
              host: 'github.com',
              login: 'octocat',
              scopes: 'repo, workflow',
              state: 'success',
              tokenSource: 'keyring',
            },
          ],
        },
      }),
    }))

    expect(status.knownAccounts.map((account) => account.login)).toContain(
      'octocat',
    )
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')

    const cancelResult = await cancelGhAuthLogin()

    expect(cancelResult.cancelled).toBe(false)
  })
})

describe('switchGhAuthAccount', () => {
  it('switches to another known GitHub account and returns refreshed status', async () => {
    const execRunner = vi
      .fn<
        (
          file: string,
          args: string[],
        ) => Promise<{ stdout: string; stderr: string }>
      >()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: '',
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({
          hosts: {
            'github.com': [
              {
                active: false,
                gitProtocol: 'https',
                host: 'github.com',
                login: 'chenghsj',
                scopes: 'repo, workflow',
                state: 'success',
                tokenSource: 'keyring',
              },
              {
                active: true,
                gitProtocol: 'https',
                host: 'github.com',
                login: 'octocat',
                scopes: 'repo, workflow',
                state: 'success',
                tokenSource: 'keyring',
              },
            ],
          },
        }),
      })

    const result = await switchGhAuthAccount('octocat', {
      execRunner,
      status: createStatus({
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
        knownAccounts: [
          {
            active: true,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'chenghsj',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
          {
            active: false,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'octocat',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
        ],
      }),
    })

    expect(execRunner).toHaveBeenNthCalledWith(1, 'gh', [
      'auth',
      'switch',
      '--hostname',
      'github.com',
      '--user',
      'octocat',
    ])
    expect(result.status.activeAccount?.login).toBe('octocat')
    expect(result.message).toContain('octocat')
  })

  it('returns noop when the selected account is already active', async () => {
    const execRunner = vi.fn()

    const status = createStatus({
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
      knownAccounts: [
        {
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'chenghsj',
          scopes: ['repo', 'workflow'],
          state: 'success',
          tokenSource: 'keyring',
        },
      ],
    })

    const result = await switchGhAuthAccount('chenghsj', {
      execRunner,
      status,
    })

    expect(result.status).toBe(status)
    expect(result.message).toContain('already using')
    expect(execRunner).not.toHaveBeenCalled()
  })
})

describe('logoutCurrentGhAuthAccount', () => {
  it('logs out the active GitHub account and returns refreshed status', async () => {
    const execRunner = vi
      .fn<
        (
          file: string,
          args: string[],
        ) => Promise<{ stdout: string; stderr: string }>
      >()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: '',
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({
          hosts: {
            'github.com': [
              {
                active: true,
                gitProtocol: 'https',
                host: 'github.com',
                login: 'octocat',
                scopes: 'repo, workflow',
                state: 'success',
                tokenSource: 'keyring',
              },
            ],
          },
        }),
      })

    const result = await logoutCurrentGhAuthAccount({
      execRunner,
      status: createStatus({
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
        knownAccounts: [
          {
            active: true,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'chenghsj',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
          {
            active: false,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'octocat',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
        ],
      }),
    })

    expect(execRunner).toHaveBeenNthCalledWith(1, 'gh', [
      'auth',
      'logout',
      '--hostname',
      'github.com',
      '--user',
      'chenghsj',
    ])
    expect(result.logins).toEqual(['chenghsj'])
    expect(result.status.activeAccount?.login).toBe('octocat')
  })
})

describe('logoutGhAuthAccount', () => {
  it('logs out the selected GitHub account and returns refreshed status', async () => {
    const execRunner = vi
      .fn<
        (
          file: string,
          args: string[],
        ) => Promise<{ stdout: string; stderr: string }>
      >()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: '',
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({
          hosts: {
            'github.com': [
              {
                active: true,
                gitProtocol: 'https',
                host: 'github.com',
                login: 'octocat',
                scopes: 'repo, workflow',
                state: 'success',
                tokenSource: 'keyring',
              },
            ],
          },
        }),
      })

    const result = await logoutGhAuthAccount('chenghsj', {
      execRunner,
      status: createStatus({
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
        knownAccounts: [
          {
            active: true,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'chenghsj',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
          {
            active: false,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'octocat',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
        ],
      }),
    })

    expect(execRunner).toHaveBeenNthCalledWith(1, 'gh', [
      'auth',
      'logout',
      '--hostname',
      'github.com',
      '--user',
      'chenghsj',
    ])
    expect(result.logins).toEqual(['chenghsj'])
    expect(result.status.activeAccount?.login).toBe('octocat')
  })
})

describe('logoutAllGhAuthAccounts', () => {
  it('logs out every known GitHub account and returns refreshed status', async () => {
    const execRunner = vi
      .fn<
        (
          file: string,
          args: string[],
        ) => Promise<{ stdout: string; stderr: string }>
      >()
      .mockResolvedValueOnce({
        stderr: '',
        stdout: '',
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: '',
      })
      .mockResolvedValueOnce({
        stderr: '',
        stdout: JSON.stringify({ hosts: {} }),
      })

    const result = await logoutAllGhAuthAccounts({
      execRunner,
      status: createStatus({
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
        knownAccounts: [
          {
            active: true,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'chenghsj',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
          {
            active: false,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'octocat',
            scopes: ['repo', 'workflow'],
            state: 'success',
            tokenSource: 'keyring',
          },
        ],
      }),
    })

    expect(execRunner).toHaveBeenNthCalledWith(1, 'gh', [
      'auth',
      'logout',
      '--hostname',
      'github.com',
      '--user',
      'chenghsj',
    ])
    expect(execRunner).toHaveBeenNthCalledWith(2, 'gh', [
      'auth',
      'logout',
      '--hostname',
      'github.com',
      '--user',
      'octocat',
    ])
    expect(result.logins).toEqual(['chenghsj', 'octocat'])
    expect(result.status.authenticated).toBe(false)
  })
})

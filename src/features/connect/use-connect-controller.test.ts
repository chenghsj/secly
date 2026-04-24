import { describe, expect, it } from 'vitest'
import { CLI_LOGIN_COMMAND } from '#/lib/product'
import {
  buildConnectStatusSnapshot,
  buildGithubAccountSignature,
  getActiveGithubAccountIdentity,
  getGithubAccounts,
} from './use-connect-controller'

function createStatus({
  activeLogin,
  ghInstalled = true,
  issues = [],
  knownLogins,
}: {
  activeLogin: string | null
  ghInstalled?: boolean
  issues?: string[]
  knownLogins: string[]
}) {
  return {
    activeAccount: activeLogin
      ? {
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: activeLogin,
          scopes: ['repo'],
          state: 'success',
          tokenSource: 'keyring',
        }
      : null,
    authenticated: activeLogin !== null,
    cliLoginCommand: CLI_LOGIN_COMMAND,
    ghInstalled,
    ghLoginCommand: 'gh auth login --web',
    installUrl: 'https://cli.github.com',
    issues,
    knownAccounts: knownLogins.map((login) => ({
      active: login === activeLogin,
      gitProtocol: 'https',
      host: 'github.com',
      login,
      scopes: ['repo'],
      state: 'success' as const,
      tokenSource: 'keyring' as const,
    })),
    statusCommand: 'gh auth status --json hosts',
  }
}

describe('use-connect-controller helpers', () => {
  it('sorts account signatures deterministically', () => {
    expect(
      buildGithubAccountSignature([
        {
          active: false,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'beta',
          scopes: [],
          state: 'success',
          tokenSource: 'keyring',
        },
        {
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'alpha',
          scopes: [],
          state: 'success',
          tokenSource: 'keyring',
        },
      ]),
    ).toBe('github.com:alpha:success:1|github.com:beta:success:0')
  })

  it('returns active GitHub identity only for authenticated github.com accounts', () => {
    expect(
      getActiveGithubAccountIdentity({
        activeAccount: {
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'cheng',
          scopes: [],
          state: 'success',
          tokenSource: 'keyring',
        },
        authenticated: true,
      }),
    ).toBe('github.com:cheng:success')
  })

  it('filters and sorts GitHub accounts for display', () => {
    expect(
      getGithubAccounts({
        activeAccount: null,
        authenticated: true,
        cliLoginCommand: CLI_LOGIN_COMMAND,
        ghInstalled: true,
        ghLoginCommand: 'gh auth login --web',
        installUrl: 'https://cli.github.com',
        issues: [],
        knownAccounts: [
          {
            active: false,
            gitProtocol: 'https',
            host: 'enterprise.github.com',
            login: 'skip-me',
            scopes: [],
            state: 'success',
            tokenSource: 'keyring',
          },
          {
            active: false,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'beta',
            scopes: [],
            state: 'success',
            tokenSource: 'keyring',
          },
          {
            active: true,
            gitProtocol: 'https',
            host: 'github.com',
            login: 'alpha',
            scopes: [],
            state: 'success',
            tokenSource: 'keyring',
          },
        ],
        statusCommand: 'gh auth status --json hosts',
      }).map((account) => account.login),
    ).toEqual(['alpha', 'beta'])
  })

  it('builds a different status snapshot when loader auth data changes', () => {
    expect(
      buildConnectStatusSnapshot(
        createStatus({
          activeLogin: 'chengjj81',
          knownLogins: ['chengjj81', 'chenghsj'],
        }),
      ),
    ).not.toBe(
      buildConnectStatusSnapshot(
        createStatus({
          activeLogin: 'chenghsj',
          knownLogins: ['chenghsj'],
        }),
      ),
    )
  })

  it('includes install and issue changes in the status snapshot', () => {
    expect(
      buildConnectStatusSnapshot(
        createStatus({
          activeLogin: null,
          knownLogins: [],
        }),
      ),
    ).not.toBe(
      buildConnectStatusSnapshot(
        createStatus({
          activeLogin: null,
          ghInstalled: false,
          issues: ['gh missing'],
          knownLogins: [],
        }),
      ),
    )
  })
})

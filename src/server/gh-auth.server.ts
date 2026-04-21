import { execFile, spawn } from 'node:child_process'
import type { SpawnOptions } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { z } from 'zod'
import { CLI_NAME } from '../lib/product'

const execFileAsync = promisify(execFile)
const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*m/g
const ONE_TIME_CODE_PATTERN = /one-time code(?:\s*\(|:)\s*([A-Z0-9-]{6,})\)?/i
const OPEN_BROWSER_URL_PATTERN =
  /(?:Open this URL to continue in your web browser:|Press Enter to open)\s*(https?:\/\/\S+)/i
const MANUAL_WEB_LOGIN_TIMEOUT_MS = 10_000

const currentFile = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(currentFile), '../..')

export const GH_AUTH_HOSTNAME = 'github.com'
export const GH_AUTH_STATUS_ARGS = [
  'auth',
  'status',
  '--json',
  'hosts',
] as const
export const GH_AUTH_LOGIN_ARGS = [
  'auth',
  'login',
  '--hostname',
  GH_AUTH_HOSTNAME,
  '--web',
  '--git-protocol',
  'https',
  '--skip-ssh-key',
  '--scopes',
  'workflow',
] as const
export const GH_AUTH_SWITCH_ARGS = [
  'auth',
  'switch',
  '--hostname',
  GH_AUTH_HOSTNAME,
] as const
export const GH_AUTH_LOGOUT_ARGS = [
  'auth',
  'logout',
  '--hostname',
  GH_AUTH_HOSTNAME,
] as const
export const GH_CLI_INSTALL_URL = 'https://cli.github.com'

const ghAuthStatusSchema = z.object({
  hosts: z.record(
    z.string(),
    z.array(
      z.object({
        active: z.boolean(),
        gitProtocol: z.string().optional(),
        host: z.string(),
        login: z.string(),
        scopes: z.string().optional(),
        state: z.string(),
        tokenSource: z.string().optional(),
      }),
    ),
  ),
})

type ExecRunner = (
  file: string,
  args: string[],
) => Promise<{
  stdout: string
  stderr: string
}>

type SpawnChild = {
  kill?: (signal?: NodeJS.Signals | number) => boolean
  on?: (event: string, listener: (...args: any[]) => void) => void
  once?: (event: string, listener: (...args: any[]) => void) => void
  stderr?: NodeJS.ReadableStream | null
  stdout?: NodeJS.ReadableStream | null
  unref: () => void
}

type SpawnRunner = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => SpawnChild

export type GhAuthAccount = {
  active: boolean
  gitProtocol: string | null
  host: string
  login: string
  scopes: string[]
  state: string
  tokenSource: string | null
}

export type GhAuthStatus = {
  authenticated: boolean
  cliLoginCommand: string
  ghInstalled: boolean
  ghLoginCommand: string
  installUrl: string
  issues: string[]
  knownAccounts: GhAuthAccount[]
  activeAccount: GhAuthAccount | null
  statusCommand: string
}

export type GhAuthLaunchResult = {
  command: string
  launched: boolean
  message: string
  method: 'background-process' | 'manual-web' | 'noop' | 'terminal'
  verificationCode?: string
  verificationUrl?: string
}

export type GhAuthCancelResult = {
  cancelled: boolean
  message: string
}

export type GhAuthSwitchResult = {
  command: string
  login: string
  message: string
  status: GhAuthStatus
}

export type GhAuthLogoutResult = {
  commands: string[]
  logins: string[]
  message: string
  status: GhAuthStatus
}

type PendingManualWebLogin = {
  activeLogin: string | null
  accountSignature: string
  child: SpawnChild
  command: string
  exited: boolean
  startedAt: number
  verificationCode: string
  verificationUrl: string
}

let pendingManualWebLogin: PendingManualWebLogin | null = null

function defaultExecRunner(file: string, args: string[]) {
  return execFileAsync(file, args)
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

function buildCliLoginCommand(addAccount = false) {
  return addAccount ? `${CLI_NAME} login --add-account` : `${CLI_NAME} login`
}

function stripAnsi(value: string) {
  return value.replaceAll(ANSI_ESCAPE_PATTERN, '')
}

function extractManualWebLoginDetails(output: string) {
  const normalized = stripAnsi(output)
  const verificationCode = normalized.match(ONE_TIME_CODE_PATTERN)?.[1]
  const verificationUrl = normalized.match(OPEN_BROWSER_URL_PATTERN)?.[1]

  if (!verificationCode || !verificationUrl) {
    return null
  }

  return {
    verificationCode,
    verificationUrl,
  }
}

function getActiveGithubHostLogin(status: Pick<GhAuthStatus, 'activeAccount'>) {
  return status.activeAccount?.host === GH_AUTH_HOSTNAME
    ? status.activeAccount.login
    : null
}

function buildGithubAccountSignature(
  status: Pick<GhAuthStatus, 'knownAccounts'>,
) {
  return status.knownAccounts
    .filter((account) => account.host === GH_AUTH_HOSTNAME)
    .map(
      (account) =>
        `${account.host}:${account.login}:${account.state}:${account.active ? '1' : '0'}`,
    )
    .sort()
    .join('|')
}

function clearPendingManualWebLogin(options?: {
  kill?: boolean
  signal?: NodeJS.Signals | number
}) {
  const pendingLogin = pendingManualWebLogin

  if (!pendingLogin) {
    return null
  }

  pendingLogin.exited = true
  pendingManualWebLogin = null

  if (options?.kill && typeof pendingLogin.child.kill === 'function') {
    pendingLogin.child.kill(options.signal ?? 'SIGTERM')
  }

  return pendingLogin
}

function getPendingManualWebLogin() {
  if (pendingManualWebLogin?.exited) {
    pendingManualWebLogin = null
  }

  return pendingManualWebLogin
}

function reconcilePendingManualWebLogin(status: GhAuthStatus) {
  const pendingLogin = getPendingManualWebLogin()

  if (!pendingLogin) {
    return
  }

  if (
    pendingLogin.accountSignature !== buildGithubAccountSignature(status) ||
    pendingLogin.activeLogin !== getActiveGithubHostLogin(status)
  ) {
    clearPendingManualWebLogin({ kill: true })
  }
}

function getGhCliCommands() {
  return {
    cliLoginCommand: buildCliLoginCommand(),
    ghLoginCommand: `gh ${GH_AUTH_LOGIN_ARGS.join(' ')}`,
    statusCommand: `gh ${GH_AUTH_STATUS_ARGS.join(' ')}`,
  }
}

function buildGhSwitchCommand(login: string) {
  return `gh ${GH_AUTH_SWITCH_ARGS.join(' ')} --user ${shellQuote(login)}`
}

function buildGhLogoutCommand(login: string) {
  return `gh ${GH_AUTH_LOGOUT_ARGS.join(' ')} --user ${shellQuote(login)}`
}

async function startManualWebGhAuthLogin(
  spawnRunner: SpawnRunner,
  command: string,
  status: GhAuthStatus,
) {
  const pendingLogin = getPendingManualWebLogin()

  if (pendingLogin) {
    return {
      command: pendingLogin.command,
      launched: false,
      message:
        'GitHub CLI login is already waiting for browser approval. Copy the code, finish the browser flow, then return to the status page.',
      method: 'manual-web' as const,
      verificationCode: pendingLogin.verificationCode,
      verificationUrl: pendingLogin.verificationUrl,
    }
  }

  const child = spawnRunner('gh', [...GH_AUTH_LOGIN_ARGS], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (
    !child.stderr ||
    !child.stdout ||
    typeof child.stderr.on !== 'function' ||
    typeof child.stdout.on !== 'function' ||
    typeof child.on !== 'function' ||
    typeof child.once !== 'function'
  ) {
    throw new Error(
      'GH VarDeck could not capture the GitHub CLI one-time code.',
    )
  }

  let bufferedOutput = ''
  let childExited = false
  let session: PendingManualWebLogin | null = null

  const details = await new Promise<{
    verificationCode: string
    verificationUrl: string
  }>((resolve, reject) => {
    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const finish = (callback: () => void) => {
      if (settled) {
        return
      }

      settled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      callback()
    }

    const maybeResolve = () => {
      const nextDetails = extractManualWebLoginDetails(bufferedOutput)

      if (!nextDetails) {
        return
      }

      finish(() => resolve(nextDetails))
    }

    const handleChunk = (chunk: Buffer | string) => {
      bufferedOutput += chunk.toString()
      maybeResolve()
    }

    const handleExit = () => {
      childExited = true

      if (session && pendingManualWebLogin === session) {
        session.exited = true
        pendingManualWebLogin = null
      }

      finish(() => {
        const summary = stripAnsi(bufferedOutput).trim()

        reject(
          new Error(
            summary
              ? `GitHub CLI exited before exposing the verification code. ${summary}`
              : 'GitHub CLI exited before exposing the verification code.',
          ),
        )
      })
    }

    child.stderr.on('data', handleChunk)
    child.stdout.on('data', handleChunk)
    child.on('exit', handleExit)
    child.once('error', (error) => {
      childExited = true

      if (session && pendingManualWebLogin === session) {
        session.exited = true
        pendingManualWebLogin = null
      }

      finish(() => reject(error))
    })

    timeoutId = setTimeout(() => {
      if (typeof child.kill === 'function') {
        child.kill()
      }

      finish(() => {
        reject(
          new Error(
            'GitHub CLI did not expose a verification code in time. Start the login flow again.',
          ),
        )
      })
    }, MANUAL_WEB_LOGIN_TIMEOUT_MS)
  })

  if (childExited) {
    throw new Error(
      'GitHub CLI stopped before the browser approval could continue. Start the login flow again.',
    )
  }

  session = {
    activeLogin: getActiveGithubHostLogin(status),
    accountSignature: buildGithubAccountSignature(status),
    child,
    command,
    exited: false,
    startedAt: Date.now(),
    verificationCode: details.verificationCode,
    verificationUrl: details.verificationUrl,
  }
  pendingManualWebLogin = session

  return {
    command,
    launched: true,
    message:
      'Copy the one-time code, continue in GitHub in your browser, approve access, then return to the status page. GH VarDeck will refresh automatically when you come back.',
    method: 'manual-web' as const,
    verificationCode: details.verificationCode,
    verificationUrl: details.verificationUrl,
  }
}

function createGhNotInstalledStatus(): GhAuthStatus {
  const commands = getGhCliCommands()

  return {
    ...commands,
    activeAccount: null,
    authenticated: false,
    ghInstalled: false,
    installUrl: GH_CLI_INSTALL_URL,
    issues: [
      `GitHub CLI is not installed. Install it from ${GH_CLI_INSTALL_URL}.`,
    ],
    knownAccounts: [],
  }
}

function normalizeScopes(value?: string) {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean)
}

function getGithubHostAccounts(status: GhAuthStatus) {
  return status.knownAccounts.filter(
    (account) => account.host === GH_AUTH_HOSTNAME,
  )
}

function getGithubHostAccountLogins(status: GhAuthStatus) {
  return [
    ...new Set(getGithubHostAccounts(status).map((account) => account.login)),
  ]
}

function parseGhAuthStatus(stdout: string): GhAuthStatus {
  const parsed = ghAuthStatusSchema.parse(JSON.parse(stdout))
  const accounts = Object.values(parsed.hosts)
    .flat()
    .map<GhAuthAccount>((entry) => ({
      active: entry.active,
      gitProtocol: entry.gitProtocol ?? null,
      host: entry.host,
      login: entry.login,
      scopes: normalizeScopes(entry.scopes),
      state: entry.state,
      tokenSource: entry.tokenSource ?? null,
    }))
  const activeAccount =
    accounts.find(
      (account) => account.host === GH_AUTH_HOSTNAME && account.active,
    ) ?? null
  const issues: string[] = []

  if (!activeAccount) {
    issues.push(
      `No active GitHub CLI session was found for ${GH_AUTH_HOSTNAME}.`,
    )
  } else if (activeAccount.state !== 'success') {
    issues.push(
      `The active GitHub CLI session for ${GH_AUTH_HOSTNAME} is reporting ${activeAccount.state}.`,
    )
  }

  return {
    ...getGhCliCommands(),
    activeAccount,
    authenticated: activeAccount?.state === 'success',
    ghInstalled: true,
    installUrl: GH_CLI_INSTALL_URL,
    issues,
    knownAccounts: accounts,
  }
}

function isCommandMissing(error: unknown) {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  )
}

function buildTerminalCommand(
  repoRootPath: string,
  options?: { addAccount?: boolean },
) {
  return `cd ${shellQuote(repoRootPath)} && npm run cli -- ${options?.addAccount ? 'login --add-account' : 'login'}`
}

export function buildLocalCliLoginCommand(
  repoRootPath = repoRoot,
  options?: { addAccount?: boolean },
) {
  return buildTerminalCommand(repoRootPath, options)
}

export async function getGhAuthStatus(
  execRunner: ExecRunner = defaultExecRunner,
): Promise<GhAuthStatus> {
  try {
    const { stdout } = await execRunner('gh', [...GH_AUTH_STATUS_ARGS])

    const status = parseGhAuthStatus(stdout)
    reconcilePendingManualWebLogin(status)

    return status
  } catch (error) {
    if (isCommandMissing(error)) {
      return createGhNotInstalledStatus()
    }

    throw error
  }
}

export async function switchGhAuthAccount(
  login: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<GhAuthSwitchResult> {
  const normalizedLogin = login.trim()

  if (!normalizedLogin) {
    throw new Error('A GitHub login is required to switch accounts.')
  }

  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  if (!status.ghInstalled) {
    throw new Error(
      `GitHub CLI is not installed. Install it from ${status.installUrl}.`,
    )
  }

  const githubAccounts = getGithubHostAccounts(status)

  if (githubAccounts.length === 0) {
    throw new Error(
      `No authenticated GitHub CLI accounts were found for ${GH_AUTH_HOSTNAME}.`,
    )
  }

  if (!githubAccounts.some((account) => account.login === normalizedLogin)) {
    throw new Error(
      `The account ${normalizedLogin} is not available for ${GH_AUTH_HOSTNAME}.`,
    )
  }

  if (
    status.activeAccount?.host === GH_AUTH_HOSTNAME &&
    status.activeAccount.login === normalizedLogin &&
    status.activeAccount.state === 'success'
  ) {
    return {
      command: buildGhSwitchCommand(normalizedLogin),
      login: normalizedLogin,
      message: `GitHub CLI is already using ${normalizedLogin}.`,
      status,
    }
  }

  await execRunner('gh', [...GH_AUTH_SWITCH_ARGS, '--user', normalizedLogin])

  const nextStatus = await getGhAuthStatus(execRunner)

  if (
    nextStatus.activeAccount?.host !== GH_AUTH_HOSTNAME ||
    nextStatus.activeAccount.login !== normalizedLogin
  ) {
    throw new Error(
      `GitHub CLI did not switch to ${normalizedLogin}. Refresh the status and try again.`,
    )
  }

  return {
    command: buildGhSwitchCommand(normalizedLogin),
    login: normalizedLogin,
    message: `Switched the active GitHub CLI account to ${normalizedLogin}.`,
    status: nextStatus,
  }
}

export async function logoutGhAuthAccount(
  login: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<GhAuthLogoutResult> {
  const normalizedLogin = login.trim()

  if (!normalizedLogin) {
    throw new Error('A GitHub login is required to log out an account.')
  }

  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  if (!status.ghInstalled) {
    throw new Error(
      `GitHub CLI is not installed. Install it from ${status.installUrl}.`,
    )
  }

  const githubAccountLogins = getGithubHostAccountLogins(status)

  if (githubAccountLogins.length === 0) {
    throw new Error(
      `No authenticated GitHub CLI accounts were found for ${GH_AUTH_HOSTNAME}.`,
    )
  }

  if (!githubAccountLogins.includes(normalizedLogin)) {
    throw new Error(
      `The account ${normalizedLogin} is not available for ${GH_AUTH_HOSTNAME}.`,
    )
  }

  await execRunner('gh', [...GH_AUTH_LOGOUT_ARGS, '--user', normalizedLogin])

  const nextStatus = await getGhAuthStatus(execRunner)

  return {
    commands: [buildGhLogoutCommand(normalizedLogin)],
    logins: [normalizedLogin],
    message: `Logged out ${normalizedLogin} from GitHub CLI on ${GH_AUTH_HOSTNAME}.`,
    status: nextStatus,
  }
}

export async function logoutCurrentGhAuthAccount(options?: {
  execRunner?: ExecRunner
  status?: GhAuthStatus
}): Promise<GhAuthLogoutResult> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))
  const activeAccount =
    status.activeAccount?.host === GH_AUTH_HOSTNAME
      ? status.activeAccount
      : null

  if (!activeAccount) {
    throw new Error(
      `No active GitHub CLI account was found for ${GH_AUTH_HOSTNAME}.`,
    )
  }

  return logoutGhAuthAccount(activeAccount.login, {
    execRunner,
    status,
  })
}

export async function logoutAllGhAuthAccounts(options?: {
  execRunner?: ExecRunner
  status?: GhAuthStatus
}): Promise<GhAuthLogoutResult> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  if (!status.ghInstalled) {
    throw new Error(
      `GitHub CLI is not installed. Install it from ${status.installUrl}.`,
    )
  }

  const githubAccountLogins = getGithubHostAccountLogins(status)

  if (githubAccountLogins.length === 0) {
    throw new Error(
      `No authenticated GitHub CLI accounts were found for ${GH_AUTH_HOSTNAME}.`,
    )
  }

  for (const nextLogin of githubAccountLogins) {
    await execRunner('gh', [...GH_AUTH_LOGOUT_ARGS, '--user', nextLogin])
  }

  const nextStatus = await getGhAuthStatus(execRunner)

  return {
    commands: githubAccountLogins.map((nextLogin) =>
      buildGhLogoutCommand(nextLogin),
    ),
    logins: githubAccountLogins,
    message:
      githubAccountLogins.length === 1
        ? `Logged out 1 GitHub CLI account from ${GH_AUTH_HOSTNAME}.`
        : `Logged out ${githubAccountLogins.length} GitHub CLI accounts from ${GH_AUTH_HOSTNAME}.`,
    status: nextStatus,
  }
}

export async function cancelGhAuthLogin(): Promise<GhAuthCancelResult> {
  const pendingLogin = getPendingManualWebLogin()

  if (!pendingLogin) {
    return {
      cancelled: false,
      message: 'No pending GitHub CLI login is waiting for browser approval.',
    }
  }

  clearPendingManualWebLogin({ kill: true })

  return {
    cancelled: true,
    message: 'Cancelled the pending GitHub CLI login flow.',
  }
}

export async function waitForGhAuthLoginCompletion(options?: {
  execRunner?: ExecRunner
  timeoutMs?: number
}): Promise<GhAuthStatus> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const timeoutMs = Math.min(Math.max(options?.timeoutMs ?? 20000, 500), 55000)
  const pending = getPendingManualWebLogin()

  if (!pending) {
    return getGhAuthStatus(execRunner)
  }

  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }

    if (pending.exited) {
      finish()
      return
    }

    const timer = setTimeout(finish, timeoutMs)

    if (typeof pending.child.once === 'function') {
      pending.child.once('exit', () => {
        clearTimeout(timer)
        finish()
      })
      pending.child.once('error', () => {
        clearTimeout(timer)
        finish()
      })
    }
  })

  return getGhAuthStatus(execRunner)
}

export async function startGhAuthLogin(options?: {
  addAccount?: boolean
  platform?: NodeJS.Platform
  presentation?: 'handoff' | 'manual-web'
  repoRootPath?: string
  spawnRunner?: SpawnRunner
  status?: GhAuthStatus
}): Promise<GhAuthLaunchResult> {
  const status = options?.status ?? (await getGhAuthStatus())
  const addAccount = options?.addAccount ?? false
  const presentation = options?.presentation ?? 'handoff'

  if (!status.ghInstalled) {
    throw new Error(
      `GitHub CLI is not installed. Install it from ${status.installUrl}.`,
    )
  }

  if (status.authenticated && !addAccount) {
    const login = status.activeAccount?.login ?? 'the active account'

    return {
      command: status.cliLoginCommand,
      launched: false,
      message: `GitHub CLI is already authenticated as ${login}.`,
      method: 'noop',
    }
  }

  const spawnRunner = options?.spawnRunner ?? spawn
  const platform = options?.platform ?? process.platform
  const repoRootPath = options?.repoRootPath ?? repoRoot

  if (presentation === 'manual-web') {
    return startManualWebGhAuthLogin(spawnRunner, status.ghLoginCommand, status)
  }

  if (platform === 'darwin') {
    const command = buildTerminalCommand(repoRootPath, { addAccount })
    const child = spawnRunner(
      'osascript',
      [
        '-e',
        'tell application "Terminal" to activate',
        '-e',
        `tell application "Terminal" to do script ${JSON.stringify(command)}`,
      ],
      {
        detached: true,
        stdio: 'ignore',
      },
    )

    child.unref()

    return {
      command,
      launched: true,
      message:
        'Opened Terminal to run the local GH VarDeck login command. Finish the browser flow there, then return to the status page. GH VarDeck will refresh automatically when you come back.',
      method: 'terminal',
    }
  }

  const child = spawnRunner('gh', [...GH_AUTH_LOGIN_ARGS], {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

  return {
    command: status.ghLoginCommand,
    launched: true,
    message:
      'Started GitHub CLI login in a background process. Complete the browser flow, then return to the status page. GH VarDeck will refresh automatically when you come back.',
    method: 'background-process',
  }
}

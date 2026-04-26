import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'
import { CLI_LOGIN_COMMAND } from '../lib/product'
import type { GhAuthStatus } from './gh-auth.server'
import { GH_CLI_INSTALL_URL, getGhAuthStatus } from './gh-auth.server'
import {
  getCurrentRequestSignal,
  resolveAbortedReadRequestFallback,
} from './request-abort.server'
import { db } from './db/client'
import { repositoryVariableLocks } from './db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'node:crypto'
import { mergeLocksAndGarbageCollect } from './db/lock-utils'

const execFileAsync = promisify(execFile)

const VARIABLE_READ_BACK_MAX_ATTEMPTS = 5
const VARIABLE_READ_BACK_RETRY_DELAY_MS = 200

const repositoryPageSchema = z.object({
  full_name: z.string(),
  html_url: z.string().url(),
  name: z.string(),
  owner: z.object({
    login: z.string(),
  }),
  permissions: z
    .object({
      admin: z.boolean().optional(),
      maintain: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
  private: z.boolean(),
  updated_at: z.string(),
  visibility: z.string().nullable().optional(),
})

const repositoryPagesSchema = z.array(z.array(repositoryPageSchema))

const repositoryVariableSchema = z.object({
  created_at: z.string(),
  name: z.string(),
  updated_at: z.string(),
  value: z.string(),
})

const repositoryVariablesSchema = z.object({
  total_count: z.number(),
  variables: z.array(repositoryVariableSchema),
})

type ExecRunner = (
  file: string,
  args: string[],
) => Promise<{
  stderr: string
  stdout: string
}>

type ExecRunnerWithOptions = (
  file: string,
  args: string[],
  options?: {
    signal?: AbortSignal
  },
) => Promise<{
  stderr: string
  stdout: string
}>

type ExecError = Error & {
  code?: number | string
  stderr?: string
  stdout?: string
}

export type GhRepositorySummary = {
  canManageEnvironments?: boolean
  canManageVariables: boolean
  isPrivate: boolean
  name: string
  nameWithOwner: string
  ownerLogin: string
  updatedAt: string
  url: string
  visibility: string
}

export type GhRepositoryVariable = {
  createdAt: string
  name: string
  updatedAt: string
  value: string
  isLocked?: boolean
}

export type UpsertRepositoryVariableResult = {
  created: boolean
  variable: GhRepositoryVariable
}

function defaultExecRunner(
  file: string,
  args: string[],
  options?: {
    signal?: AbortSignal
  },
) {
  return execFileAsync(file, args, { signal: options?.signal })
}

function withExecSignal(
  execRunner: ExecRunnerWithOptions,
  signal?: AbortSignal,
): ExecRunner {
  return (file, args) => execRunner(file, args, { signal })
}

function buildGhApiArgs(...args: string[]) {
  return ['api', '--header', 'Accept: application/vnd.github+json', ...args]
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getErrorText(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Unknown GitHub CLI error.'
  }

  const execError = error as ExecError
  return [execError.message, execError.stderr, execError.stdout]
    .filter((value): value is string => Boolean(value?.trim()))
    .join('\n')
}

function isNotFoundError(error: unknown) {
  return /404|not found/i.test(getErrorText(error))
}

function assertGhReady(status: GhAuthStatus) {
  if (!status.ghInstalled) {
    throw new Error(
      `GitHub CLI is not installed. Install it from ${GH_CLI_INSTALL_URL}.`,
    )
  }

  if (!status.authenticated) {
    throw new Error(
      status.issues[0] ??
        `GitHub CLI is not authenticated. Run ${CLI_LOGIN_COMMAND} first.`,
    )
  }
}

function parseRepository(repository: string) {
  const normalized = repository.trim()

  if (!/^[^/\s]+\/[^/\s]+$/.test(normalized)) {
    throw new Error('Repository must use the owner/repo format.')
  }

  const [owner, repo] = normalized.split('/')

  return {
    owner,
    repo,
    repository: normalized,
  }
}

function buildRepositoryVariablesPath(repository: string) {
  const { owner, repo } = parseRepository(repository)

  return `/repos/${owner}/${repo}/actions/variables`
}

function buildRepositoryVariablePath(repository: string, name: string) {
  return `${buildRepositoryVariablesPath(repository)}/${encodeURIComponent(name)}`
}

function mapRepositoryVariable(
  variable: z.infer<typeof repositoryVariableSchema>,
): GhRepositoryVariable {
  return {
    createdAt: variable.created_at,
    name: variable.name,
    updatedAt: variable.updated_at,
    value: variable.value,
  }
}

function buildFallbackRepositoryVariableMetadata(
  variableName: string,
  value: string,
  existing: GhRepositoryVariable | null,
): GhRepositoryVariable {
  const timestamp = new Date().toISOString()

  return {
    createdAt: existing?.createdAt ?? timestamp,
    name: variableName,
    updatedAt: timestamp,
    value,
  }
}

async function readBackRepositoryVariableMetadata(
  repository: string,
  variableName: string,
  execRunner: ExecRunner,
): Promise<GhRepositoryVariable | null> {
  for (
    let attempt = 0;
    attempt < VARIABLE_READ_BACK_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const variable = await getRepositoryVariableInternal(
      repository,
      variableName,
      execRunner,
    )

    if (variable) {
      return variable
    }

    if (attempt < VARIABLE_READ_BACK_MAX_ATTEMPTS - 1) {
      await delay(VARIABLE_READ_BACK_RETRY_DELAY_MS)
    }
  }

  return null
}

async function getRepositoryVariableInternal(
  repository: string,
  name: string,
  execRunner: ExecRunner,
): Promise<GhRepositoryVariable | null> {
  try {
    const { stdout } = await execRunner(
      'gh',
      buildGhApiArgs(
        '--method',
        'GET',
        buildRepositoryVariablePath(repository, name),
      ),
    )

    return mapRepositoryVariable(
      repositoryVariableSchema.parse(JSON.parse(stdout)),
    )
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export async function listManageableRepositories(options?: {
  execRunner?: ExecRunnerWithOptions
  signal?: AbortSignal
  status?: GhAuthStatus
}): Promise<GhRepositorySummary[]> {
  const signal = options?.signal ?? getCurrentRequestSignal()
  const execRunner = withExecSignal(
    options?.execRunner ?? defaultExecRunner,
    signal,
  )
  try {
    const status = options?.status ?? (await getGhAuthStatus(execRunner))

    assertGhReady(status)

    const { stdout } = await execRunner(
      'gh',
      buildGhApiArgs(
        '--method',
        'GET',
        '--paginate',
        '--slurp',
        '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
      ),
    )

    return repositoryPagesSchema
      .parse(JSON.parse(stdout))
      .flat()
      .map<GhRepositorySummary>((repository) => ({
        canManageEnvironments: Boolean(repository.permissions?.admin),
        canManageVariables: Boolean(
          repository.permissions?.admin ||
          repository.permissions?.maintain ||
          repository.permissions?.push,
        ),
        isPrivate: repository.private,
        name: repository.name,
        nameWithOwner: repository.full_name,
        ownerLogin: repository.owner.login,
        updatedAt: repository.updated_at,
        url: repository.html_url,
        visibility:
          repository.visibility ?? (repository.private ? 'private' : 'public'),
      }))
      .filter((repository) => repository.canManageVariables)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  } catch (error) {
    return resolveAbortedReadRequestFallback({
      error,
      fallback: [],
      signal,
    })
  }
}

export async function listRepositoryVariables(
  repository: string,
  options?: {
    execRunner?: ExecRunnerWithOptions
    signal?: AbortSignal
    status?: GhAuthStatus
  },
): Promise<GhRepositoryVariable[]> {
  const signal = options?.signal ?? getCurrentRequestSignal()
  const execRunner = withExecSignal(
    options?.execRunner ?? defaultExecRunner,
    signal,
  )
  try {
    const status = options?.status ?? (await getGhAuthStatus(execRunner))

    assertGhReady(status)

    const { stdout } = await execRunner(
      'gh',
      buildGhApiArgs(
        '--method',
        'GET',
        `${buildRepositoryVariablesPath(repository)}?per_page=100`,
      ),
    )

    const ghVariables = repositoryVariablesSchema
      .parse(JSON.parse(stdout))
      .variables.map(mapRepositoryVariable)

    return mergeLocksAndGarbageCollect(ghVariables, {
      repository,
      scope: 'repository-variables',
    }).sort((left, right) => left.name.localeCompare(right.name))
  } catch (error) {
    return resolveAbortedReadRequestFallback({
      error,
      fallback: [],
      signal,
    })
  }
}

export async function upsertRepositoryVariable(
  repository: string,
  name: string,
  value: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<UpsertRepositoryVariableResult> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)

  const variableName = name.trim()

  if (!variableName) {
    throw new Error('Variable name is required.')
  }

  const existing = await getRepositoryVariableInternal(
    repository,
    variableName,
    execRunner,
  )

  const args = existing
    ? buildGhApiArgs(
        '--method',
        'PATCH',
        buildRepositoryVariablePath(repository, variableName),
        '-f',
        `name=${variableName}`,
        '-f',
        `value=${value}`,
      )
    : buildGhApiArgs(
        '--method',
        'POST',
        buildRepositoryVariablesPath(repository),
        '-f',
        `name=${variableName}`,
        '-f',
        `value=${value}`,
      )

  await execRunner('gh', args)

  const variable =
    (await readBackRepositoryVariableMetadata(
      repository,
      variableName,
      execRunner,
    )) ?? buildFallbackRepositoryVariableMetadata(variableName, value, existing)

  return {
    created: !existing,
    variable,
  }
}

export async function deleteRepositoryVariable(
  repository: string,
  name: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<void> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)

  const variableName = name.trim()

  if (!variableName) {
    throw new Error('Variable name is required.')
  }

  await execRunner(
    'gh',
    buildGhApiArgs(
      '--method',
      'DELETE',
      buildRepositoryVariablePath(repository, variableName),
    ),
  )
}

export async function toggleRepositoryVariableLock(
  repository: string,
  name: string,
  isLocked: boolean,
  scope: string = 'repository-variables',
  environmentName: string = '',
): Promise<void> {
  const variableName = name.trim()

  if (!variableName) {
    throw new Error('Variable name is required.')
  }

  // Always delete existing lock first
  db.delete(repositoryVariableLocks)
    .where(
      and(
        eq(repositoryVariableLocks.repository, repository),
        eq(repositoryVariableLocks.scope, scope),
        eq(repositoryVariableLocks.environmentName, environmentName),
        eq(repositoryVariableLocks.variableName, variableName),
      ),
    )
    .run()

  if (isLocked) {
    db.insert(repositoryVariableLocks)
      .values({
        id: crypto.randomUUID(),
        repository,
        scope,
        environmentName,
        variableName,
        createdAt: new Date().toISOString(),
      })
      .run()
  }
}

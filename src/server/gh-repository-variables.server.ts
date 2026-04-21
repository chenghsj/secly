import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'
import type { GhAuthStatus } from './gh-auth.server'
import { GH_CLI_INSTALL_URL, getGhAuthStatus } from './gh-auth.server'

const execFileAsync = promisify(execFile)

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

type ExecError = Error & {
  code?: number | string
  stderr?: string
  stdout?: string
}

export type GhRepositorySummary = {
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
}

export type UpsertRepositoryVariableResult = {
  created: boolean
  variable: GhRepositoryVariable
}

function defaultExecRunner(file: string, args: string[]) {
  return execFileAsync(file, args)
}

function buildGhApiArgs(...args: string[]) {
  return ['api', '--header', 'Accept: application/vnd.github+json', ...args]
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
        'GitHub CLI is not authenticated. Run ghdeck login first.',
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
  execRunner?: ExecRunner
  status?: GhAuthStatus
}): Promise<GhRepositorySummary[]> {
  const execRunner = options?.execRunner ?? defaultExecRunner
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
}

export async function listRepositoryVariables(
  repository: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<GhRepositoryVariable[]> {
  const execRunner = options?.execRunner ?? defaultExecRunner
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

  return repositoryVariablesSchema
    .parse(JSON.parse(stdout))
    .variables.map(mapRepositoryVariable)
    .sort((left, right) => left.name.localeCompare(right.name))
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

  const variable = await getRepositoryVariableInternal(
    repository,
    variableName,
    execRunner,
  )

  if (!variable) {
    throw new Error(
      `GitHub CLI reported success, but ${variableName} could not be read back.`,
    )
  }

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

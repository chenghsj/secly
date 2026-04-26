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
import { mergeLocksAndGarbageCollect } from './db/lock-utils'

const execFileAsync = promisify(execFile)

const SECRET_READ_BACK_MAX_ATTEMPTS = 5
const SECRET_READ_BACK_RETRY_DELAY_MS = 200
const VARIABLE_READ_BACK_MAX_ATTEMPTS = 5
const VARIABLE_READ_BACK_RETRY_DELAY_MS = 200

const actionsSecretSchema = z.object({
  name: z.string(),
  updatedAt: z.string(),
  visibility: z.string().nullable().optional(),
})

const actionsVariableSchema = z.object({
  createdAt: z.string(),
  name: z.string(),
  updatedAt: z.string(),
  value: z.string(),
})

const environmentSchema = z.object({
  created_at: z.string(),
  html_url: z.string().url(),
  name: z.string(),
  protection_rules: z.array(z.object({ type: z.string() })).optional(),
  updated_at: z.string(),
})

const environmentsResponseSchema = z.object({
  environments: z.array(environmentSchema),
  total_count: z.number(),
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

export type GhActionsSecret = {
  name: string
  updatedAt: string
  visibility: string | null
  isLocked?: boolean
}

export type GhActionsVariable = {
  createdAt: string
  name: string
  updatedAt: string
  value: string
  isLocked?: boolean
}

export type GhEnvironmentSummary = {
  createdAt: string
  htmlUrl: string
  name: string
  protectionRulesCount: number
  secretCount: number
  updatedAt: string
  variableCount: number
}

export type UpsertActionsSecretResult = {
  created: boolean
  secret: GhActionsSecret
}

export type UpsertActionsVariableResult = {
  created: boolean
  variable: GhActionsVariable
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

function normalizeEnvironmentName(environmentName: string) {
  const normalized = environmentName.trim()

  if (!normalized) {
    throw new Error('Environment name is required.')
  }

  return normalized
}

function normalizeEntryName(name: string, label: 'Secret' | 'Variable') {
  const normalized = name.trim()

  if (!normalized) {
    throw new Error(`${label} name is required.`)
  }

  return normalized
}

function buildEnvironmentBasePath(repository: string) {
  const { owner, repo } = parseRepository(repository)

  return `/repos/${owner}/${repo}/environments`
}

function buildEnvironmentPath(repository: string, environmentName: string) {
  return `${buildEnvironmentBasePath(repository)}/${encodeURIComponent(environmentName)}`
}

function buildEnvironmentManagementAccessError(repository: string) {
  return new Error(
    `GitHub could not manage environments for ${repository}. Creating and deleting environments requires repository owner or admin access, and private repositories may also require a compatible GitHub plan.`,
  )
}

function buildGhVariableListArgs(repository: string, environmentName?: string) {
  return [
    'variable',
    'list',
    '--repo',
    repository,
    '--json',
    'name,value,createdAt,updatedAt',
    ...(environmentName ? ['--env', environmentName] : []),
  ]
}

function buildGhVariableSetArgs(
  repository: string,
  name: string,
  value: string,
  environmentName?: string,
) {
  return [
    'variable',
    'set',
    name,
    '--repo',
    repository,
    '--body',
    value,
    ...(environmentName ? ['--env', environmentName] : []),
  ]
}

function buildGhVariableDeleteArgs(
  repository: string,
  name: string,
  environmentName?: string,
) {
  return [
    'variable',
    'delete',
    name,
    '--repo',
    repository,
    ...(environmentName ? ['--env', environmentName] : []),
  ]
}

function buildGhSecretListArgs(repository: string, environmentName?: string) {
  return [
    'secret',
    'list',
    '--repo',
    repository,
    '--json',
    'name,updatedAt,visibility',
    ...(environmentName ? ['--env', environmentName] : []),
  ]
}

function buildGhSecretSetArgs(
  repository: string,
  name: string,
  value: string,
  environmentName?: string,
) {
  return [
    'secret',
    'set',
    name,
    '--repo',
    repository,
    '--body',
    value,
    ...(environmentName ? ['--env', environmentName] : []),
  ]
}

function buildGhSecretDeleteArgs(
  repository: string,
  name: string,
  environmentName?: string,
) {
  return [
    'secret',
    'delete',
    name,
    '--repo',
    repository,
    ...(environmentName ? ['--env', environmentName] : []),
  ]
}

function mapEnvironment(
  environment: z.infer<typeof environmentSchema>,
  {
    secretCount = 0,
    variableCount = 0,
  }: {
    secretCount?: number
    variableCount?: number
  } = {},
): GhEnvironmentSummary {
  return {
    createdAt: environment.created_at,
    htmlUrl: environment.html_url,
    name: environment.name,
    protectionRulesCount: environment.protection_rules?.length ?? 0,
    secretCount,
    updatedAt: environment.updated_at,
    variableCount,
  }
}

function mapSecret(
  secret: z.infer<typeof actionsSecretSchema>,
): GhActionsSecret {
  return {
    name: secret.name,
    updatedAt: secret.updatedAt,
    visibility: secret.visibility ?? null,
  }
}

function mapVariable(
  variable: z.infer<typeof actionsVariableSchema>,
): GhActionsVariable {
  return {
    createdAt: variable.createdAt,
    name: variable.name,
    updatedAt: variable.updatedAt,
    value: variable.value,
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function buildFallbackSecretMetadata(
  secretName: string,
  existing: GhActionsSecret | undefined,
): GhActionsSecret {
  return {
    name: secretName,
    updatedAt: new Date().toISOString(),
    visibility: existing?.visibility ?? null,
  }
}

function buildFallbackVariableMetadata(
  variableName: string,
  value: string,
  existing: GhActionsVariable | undefined,
): GhActionsVariable {
  const timestamp = new Date().toISOString()

  return {
    createdAt: existing?.createdAt ?? timestamp,
    name: variableName,
    updatedAt: timestamp,
    value,
  }
}

async function listSecretsInternal(
  repository: string,
  execRunner: ExecRunner,
  environmentName?: string,
): Promise<GhActionsSecret[]> {
  const { stdout } = await execRunner(
    'gh',
    buildGhSecretListArgs(repository, environmentName),
  )

  return z
    .array(actionsSecretSchema)
    .parse(JSON.parse(stdout))
    .map(mapSecret)
    .sort((left, right) => left.name.localeCompare(right.name))
}

async function listVariablesInternal(
  repository: string,
  execRunner: ExecRunner,
  environmentName?: string,
): Promise<GhActionsVariable[]> {
  const { stdout } = await execRunner(
    'gh',
    buildGhVariableListArgs(repository, environmentName),
  )

  return z
    .array(actionsVariableSchema)
    .parse(JSON.parse(stdout))
    .map(mapVariable)
    .sort((left, right) => left.name.localeCompare(right.name))
}

async function readBackSecretMetadata(
  repository: string,
  secretName: string,
  execRunner: ExecRunner,
  environmentName?: string,
): Promise<GhActionsSecret | null> {
  for (let attempt = 0; attempt < SECRET_READ_BACK_MAX_ATTEMPTS; attempt += 1) {
    const secrets = await listSecretsInternal(
      repository,
      execRunner,
      environmentName,
    )
    const secret = secrets.find((item) => item.name === secretName)

    if (secret) {
      return secret
    }

    if (attempt < SECRET_READ_BACK_MAX_ATTEMPTS - 1) {
      await delay(SECRET_READ_BACK_RETRY_DELAY_MS)
    }
  }

  return null
}

async function readBackVariableMetadata(
  repository: string,
  variableName: string,
  execRunner: ExecRunner,
  environmentName?: string,
): Promise<GhActionsVariable | null> {
  for (
    let attempt = 0;
    attempt < VARIABLE_READ_BACK_MAX_ATTEMPTS;
    attempt += 1
  ) {
    const variables = await listVariablesInternal(
      repository,
      execRunner,
      environmentName,
    )
    const variable = variables.find((item) => item.name === variableName)

    if (variable) {
      return variable
    }

    if (attempt < VARIABLE_READ_BACK_MAX_ATTEMPTS - 1) {
      await delay(VARIABLE_READ_BACK_RETRY_DELAY_MS)
    }
  }

  return null
}

async function getEnvironmentInternal(
  repository: string,
  environmentName: string,
  execRunner: ExecRunner,
): Promise<GhEnvironmentSummary | null> {
  try {
    const { stdout } = await execRunner(
      'gh',
      buildGhApiArgs(
        '--method',
        'GET',
        buildEnvironmentPath(repository, environmentName),
      ),
    )

    return mapEnvironment(environmentSchema.parse(JSON.parse(stdout)))
  } catch (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }
}

export async function listRepositorySecrets(
  repository: string,
  options?: {
    execRunner?: ExecRunnerWithOptions
    signal?: AbortSignal
    status?: GhAuthStatus
  },
): Promise<GhActionsSecret[]> {
  const signal = options?.signal ?? getCurrentRequestSignal()
  const execRunner = withExecSignal(
    options?.execRunner ?? defaultExecRunner,
    signal,
  )
  try {
    const status = options?.status ?? (await getGhAuthStatus(execRunner))

    assertGhReady(status)
    parseRepository(repository)

    const secrets = await listSecretsInternal(repository, execRunner)
    return mergeLocksAndGarbageCollect(secrets, {
      repository,
      scope: 'repository-secrets',
    })
  } catch (error) {
    return resolveAbortedReadRequestFallback({
      error,
      fallback: [],
      signal,
    })
  }
}

export async function upsertRepositorySecret(
  repository: string,
  name: string,
  value: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<UpsertActionsSecretResult> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)
  parseRepository(repository)

  const secretName = normalizeEntryName(name, 'Secret')
  const existingSecrets = await listSecretsInternal(repository, execRunner)
  const existing = existingSecrets.find((secret) => secret.name === secretName)

  await execRunner('gh', buildGhSecretSetArgs(repository, secretName, value))

  const secret =
    (await readBackSecretMetadata(repository, secretName, execRunner)) ??
    buildFallbackSecretMetadata(secretName, existing)

  return {
    created: !existing,
    secret,
  }
}

export async function deleteRepositorySecret(
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
  parseRepository(repository)

  const secretName = normalizeEntryName(name, 'Secret')
  await execRunner('gh', buildGhSecretDeleteArgs(repository, secretName))
}

export async function listRepositoryEnvironments(
  repository: string,
  options?: {
    execRunner?: ExecRunnerWithOptions
    signal?: AbortSignal
    status?: GhAuthStatus
  },
): Promise<GhEnvironmentSummary[]> {
  const signal = options?.signal ?? getCurrentRequestSignal()
  const execRunner = withExecSignal(
    options?.execRunner ?? defaultExecRunner,
    signal,
  )
  try {
    const status = options?.status ?? (await getGhAuthStatus(execRunner))

    assertGhReady(status)
    parseRepository(repository)

    const { stdout } = await execRunner(
      'gh',
      buildGhApiArgs(
        '--method',
        'GET',
        `${buildEnvironmentBasePath(repository)}?per_page=100`,
      ),
    )

    const environments = environmentsResponseSchema.parse(JSON.parse(stdout))

    const environmentSummaries = await Promise.all(
      environments.environments.map(async (environment) => {
        const [variables, secrets] = await Promise.all([
          listVariablesInternal(repository, execRunner, environment.name),
          listSecretsInternal(repository, execRunner, environment.name),
        ])

        return mapEnvironment(environment, {
          secretCount: secrets.length,
          variableCount: variables.length,
        })
      }),
    )

    return environmentSummaries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )
  } catch (error) {
    return resolveAbortedReadRequestFallback({
      error,
      fallback: [],
      signal,
    })
  }
}

export async function createRepositoryEnvironment(
  repository: string,
  environmentName: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<GhEnvironmentSummary> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)
  parseRepository(repository)

  const normalizedEnvironmentName = normalizeEnvironmentName(environmentName)
  const existing = await getEnvironmentInternal(
    repository,
    normalizedEnvironmentName,
    execRunner,
  )

  if (existing) {
    throw new Error(
      `${normalizedEnvironmentName} already exists in ${repository}.`,
    )
  }

  try {
    await execRunner(
      'gh',
      buildGhApiArgs(
        '--method',
        'PUT',
        buildEnvironmentPath(repository, normalizedEnvironmentName),
      ),
    )
  } catch (error) {
    if (isNotFoundError(error)) {
      throw buildEnvironmentManagementAccessError(repository)
    }

    throw error
  }

  const environment = await getEnvironmentInternal(
    repository,
    normalizedEnvironmentName,
    execRunner,
  )

  if (!environment) {
    throw new Error(
      `GitHub CLI reported success, but ${normalizedEnvironmentName} could not be read back.`,
    )
  }

  return environment
}

export async function deleteRepositoryEnvironment(
  repository: string,
  environmentName: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<void> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)
  parseRepository(repository)

  const normalizedEnvironmentName = normalizeEnvironmentName(environmentName)

  try {
    await execRunner(
      'gh',
      buildGhApiArgs(
        '--method',
        'DELETE',
        buildEnvironmentPath(repository, normalizedEnvironmentName),
      ),
    )
  } catch (error) {
    if (isNotFoundError(error)) {
      throw buildEnvironmentManagementAccessError(repository)
    }

    throw error
  }
}

export async function listEnvironmentVariables(
  repository: string,
  environmentName: string,
  options?: {
    execRunner?: ExecRunnerWithOptions
    signal?: AbortSignal
    status?: GhAuthStatus
  },
): Promise<GhActionsVariable[]> {
  const signal = options?.signal ?? getCurrentRequestSignal()
  const execRunner = withExecSignal(
    options?.execRunner ?? defaultExecRunner,
    signal,
  )
  try {
    const status = options?.status ?? (await getGhAuthStatus(execRunner))

    assertGhReady(status)
    parseRepository(repository)

    const normalizedEnvName = normalizeEnvironmentName(environmentName)
    const variables = await listVariablesInternal(
      repository,
      execRunner,
      normalizedEnvName,
    )
    return mergeLocksAndGarbageCollect(variables, {
      repository,
      scope: 'environment-variables',
      environmentName: normalizedEnvName,
    })
  } catch (error) {
    return resolveAbortedReadRequestFallback({
      error,
      fallback: [],
      signal,
    })
  }
}

export async function upsertEnvironmentVariable(
  repository: string,
  environmentName: string,
  name: string,
  value: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<UpsertActionsVariableResult> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)
  parseRepository(repository)

  const normalizedEnvironmentName = normalizeEnvironmentName(environmentName)
  const variableName = normalizeEntryName(name, 'Variable')
  const existingVariables = await listVariablesInternal(
    repository,
    execRunner,
    normalizedEnvironmentName,
  )
  const existing = existingVariables.find(
    (variable) => variable.name === variableName,
  )

  await execRunner(
    'gh',
    buildGhVariableSetArgs(
      repository,
      variableName,
      value,
      normalizedEnvironmentName,
    ),
  )

  const variable =
    (await readBackVariableMetadata(
      repository,
      variableName,
      execRunner,
      normalizedEnvironmentName,
    )) ?? buildFallbackVariableMetadata(variableName, value, existing)

  return {
    created: !existing,
    variable,
  }
}

export async function deleteEnvironmentVariable(
  repository: string,
  environmentName: string,
  name: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<void> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)
  parseRepository(repository)

  await execRunner(
    'gh',
    buildGhVariableDeleteArgs(
      repository,
      normalizeEntryName(name, 'Variable'),
      normalizeEnvironmentName(environmentName),
    ),
  )
}

export async function listEnvironmentSecrets(
  repository: string,
  environmentName: string,
  options?: {
    execRunner?: ExecRunnerWithOptions
    signal?: AbortSignal
    status?: GhAuthStatus
  },
): Promise<GhActionsSecret[]> {
  const signal = options?.signal ?? getCurrentRequestSignal()
  const execRunner = withExecSignal(
    options?.execRunner ?? defaultExecRunner,
    signal,
  )
  try {
    const status = options?.status ?? (await getGhAuthStatus(execRunner))

    assertGhReady(status)
    parseRepository(repository)

    const normalizedEnvName = normalizeEnvironmentName(environmentName)
    const secrets = await listSecretsInternal(
      repository,
      execRunner,
      normalizedEnvName,
    )
    return mergeLocksAndGarbageCollect(secrets, {
      repository,
      scope: 'environment-secrets',
      environmentName: normalizedEnvName,
    })
  } catch (error) {
    return resolveAbortedReadRequestFallback({
      error,
      fallback: [],
      signal,
    })
  }
}

export async function upsertEnvironmentSecret(
  repository: string,
  environmentName: string,
  name: string,
  value: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<UpsertActionsSecretResult> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)
  parseRepository(repository)

  const normalizedEnvironmentName = normalizeEnvironmentName(environmentName)
  const secretName = normalizeEntryName(name, 'Secret')
  const existingSecrets = await listSecretsInternal(
    repository,
    execRunner,
    normalizedEnvironmentName,
  )
  const existing = existingSecrets.find((secret) => secret.name === secretName)

  await execRunner(
    'gh',
    buildGhSecretSetArgs(
      repository,
      secretName,
      value,
      normalizedEnvironmentName,
    ),
  )

  const secret =
    (await readBackSecretMetadata(
      repository,
      secretName,
      execRunner,
      normalizedEnvironmentName,
    )) ?? buildFallbackSecretMetadata(secretName, existing)

  return {
    created: !existing,
    secret,
  }
}

export async function deleteEnvironmentSecret(
  repository: string,
  environmentName: string,
  name: string,
  options?: {
    execRunner?: ExecRunner
    status?: GhAuthStatus
  },
): Promise<void> {
  const execRunner = options?.execRunner ?? defaultExecRunner
  const status = options?.status ?? (await getGhAuthStatus(execRunner))

  assertGhReady(status)
  parseRepository(repository)

  await execRunner(
    'gh',
    buildGhSecretDeleteArgs(
      repository,
      normalizeEntryName(name, 'Secret'),
      normalizeEnvironmentName(environmentName),
    ),
  )
}

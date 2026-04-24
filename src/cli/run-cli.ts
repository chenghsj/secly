import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { Command } from 'commander'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SLUG,
  CLI_LINK_DISPLAY,
  CLI_NAME,
} from '../lib/product'
import { ensureAppDirectories, getAppPaths } from '../server/app-paths'
import { GH_AUTH_LOGIN_ARGS, getGhAuthStatus } from '../server/gh-auth.server'
import {
  deleteRepositoryVariable,
  listManageableRepositories,
  listRepositoryVariables,
  upsertRepositoryVariable,
} from '../server/gh-repository-variables.server'
import { DEFAULT_UI_HOST, DEFAULT_UI_PORT, launchUi } from './ui-launch'
import type { AppPaths } from '../server/app-paths'

type InstallState = {
  appDataRoot: string
  cliLink: string | null
  installedAt: string
  launcherPath: string
  repoRoot: string
  updatedAt: string
}

const currentFile = fileURLToPath(import.meta.url)
const repoRoot = resolve(dirname(currentFile), '../..')
const launcherPath = resolve(repoRoot, `bin/${CLI_NAME}.mjs`)

function getCliVersion() {
  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
    ) as { version?: string }

    return packageJson.version ?? '0.0.0-dev'
  } catch {
    return '0.0.0-dev'
  }
}

function nowIso() {
  return new Date().toISOString()
}

function readInstallState(paths: AppPaths): InstallState | null {
  if (!existsSync(paths.installStateFile)) {
    return null
  }

  try {
    return JSON.parse(
      readFileSync(paths.installStateFile, 'utf8'),
    ) as InstallState
  } catch {
    return null
  }
}

function writeInstallState(paths: AppPaths, cliLink: string | null) {
  const existing = readInstallState(paths)

  const installState: InstallState = {
    appDataRoot: paths.root,
    cliLink,
    installedAt: existing?.installedAt ?? nowIso(),
    launcherPath,
    repoRoot,
    updatedAt: nowIso(),
  }

  writeFileSync(
    paths.installStateFile,
    `${JSON.stringify(installState, null, 2)}\n`,
    'utf8',
  )
}

function resolveSymlinkTarget(linkPath: string) {
  return resolve(dirname(linkPath), readlinkSync(linkPath))
}

function isManagedLauncherTarget(targetPath: string) {
  return targetPath === launcherPath
}

function canRemoveCliLink(linkPath: string, installState: InstallState | null) {
  if (!existsSync(linkPath)) {
    return false
  }

  const stat = lstatSync(linkPath)

  if (!stat.isSymbolicLink()) {
    return false
  }

  const target = resolveSymlinkTarget(linkPath)
  return isManagedLauncherTarget(target) || installState?.cliLink === linkPath
}

function ensureLauncherExecutable() {
  const launcherStat = statSync(launcherPath)
  const executableMode = launcherStat.mode | 0o100 | 0o010 | 0o001

  if (launcherStat.mode !== executableMode) {
    chmodSync(launcherPath, executableMode)
  }
}

function ensureLocalLink(paths: AppPaths, force = false) {
  ensureLauncherExecutable()
  mkdirSync(paths.localBinDir, { recursive: true })

  if (existsSync(paths.cliLink)) {
    const stat = lstatSync(paths.cliLink)

    if (stat.isSymbolicLink()) {
      const target = resolveSymlinkTarget(paths.cliLink)

      if (target === launcherPath) {
        return 'unchanged'
      }
    }

    if (existsSync(paths.cliLink) && !force) {
      throw new Error(
        `${paths.cliLink} already exists and is not the expected ${APP_NAME} launcher. Re-run with --force to replace it.`,
      )
    }

    rmSync(paths.cliLink, { force: true })
  }

  symlinkSync(launcherPath, paths.cliLink)
  return 'created'
}

function ensureDatabasePlaceholder(paths: AppPaths) {
  if (!existsSync(paths.databaseFile)) {
    writeFileSync(paths.databaseFile, '', 'utf8')
  }
}

function ensureLocalRuntimeState() {
  const paths = ensureAppDirectories()
  ensureDatabasePlaceholder(paths)
  writeInstallState(paths, existsSync(paths.cliLink) ? paths.cliLink : null)

  return paths
}

function printPaths(paths: AppPaths) {
  console.log(`App data root: ${paths.root}`)
  console.log(`SQLite file:   ${paths.databaseFile}`)
  console.log(`Install state: ${paths.installStateFile}`)
  console.log(`CLI shim:      ${paths.cliLink}`)
}

async function printGhCliStatus() {
  const status = await getGhAuthStatus()

  console.log(`GitHub CLI:   ${status.ghInstalled ? 'installed' : 'missing'}`)
  console.log(
    `Auth state:   ${status.authenticated ? 'authenticated' : 'not authenticated'}`,
  )

  if (status.activeAccount) {
    console.log(
      `Account:      ${status.activeAccount.login}@${status.activeAccount.host}`,
    )
    console.log(
      `Token store:  ${status.activeAccount.tokenSource ?? 'unknown'}`,
    )
    console.log(
      `Git protocol: ${status.activeAccount.gitProtocol ?? 'unknown'}`,
    )
    console.log(
      `Scopes:       ${status.activeAccount.scopes.join(', ') || 'not reported'}`,
    )
  }

  if (status.issues.length > 0) {
    console.log(`Auth issues:  ${status.issues.join(' | ')}`)
  }

  console.log(`Status cmd:   ${status.statusCommand}`)
  console.log(`Login cmd:    ${status.cliLoginCommand}`)

  return status
}

async function confirmUninstall(paths: AppPaths) {
  const prompt = createInterface({ input: stdin, output: stdout })

  try {
    const answer = await prompt.question(
      `Remove ${APP_NAME} local state from ${paths.root}? [y/N] `,
    )

    const normalizedAnswer = answer.trim().toLowerCase()

    return normalizedAnswer === 'y' || normalizedAnswer === 'yes'
  } finally {
    prompt.close()
  }
}

function guardDeletionTarget(targetPath: string) {
  if (!targetPath.endsWith(`/${APP_SLUG}`)) {
    throw new Error(`Refusing to remove unexpected directory: ${targetPath}`)
  }
}

function printPlanned(message: string) {
  console.error(`[planned] ${message}`)
  process.exitCode = 1
}

function hasCliLink(paths: AppPaths) {
  return existsSync(paths.cliLink)
}

function hasDatabaseFile(paths: AppPaths) {
  if (!existsSync(paths.databaseFile)) {
    return false
  }

  return statSync(paths.databaseFile).isFile()
}

function runInteractiveGhLogin() {
  const result = spawnSync('gh', [...GH_AUTH_LOGIN_ARGS], {
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  return result.status ?? 1
}

function printRepositoryList(
  repositories: Awaited<ReturnType<typeof listManageableRepositories>>,
) {
  if (repositories.length === 0) {
    console.log('No repositories with variable-management access were found.')
    return
  }

  repositories.forEach((repository) => {
    console.log(
      `${repository.nameWithOwner}\t${repository.visibility}\t${repository.updatedAt}`,
    )
  })
}

function printVariableList(
  repository: string,
  variables: Awaited<ReturnType<typeof listRepositoryVariables>>,
) {
  if (variables.length === 0) {
    console.log(`No repository variables found for ${repository}.`)
    return
  }

  variables.forEach((variable) => {
    console.log(`${variable.name}=${variable.value}\t${variable.updatedAt}`)
  })
}

const program = new Command()

program
  .name(CLI_NAME)
  .description(APP_DESCRIPTION)
  .version(getCliVersion())
  .showHelpAfterError()

program
  .command('install')
  .description(
    `Create ${APP_NAME} local state and optionally link the CLI shim.`,
  )
  .option(
    '--force',
    'Replace an existing shim if it does not point at this repository.',
  )
  .option('--no-link', `Skip creating ${CLI_LINK_DISPLAY}.`)
  .action((options: { force?: boolean; link?: boolean }) => {
    const paths = ensureAppDirectories()
    ensureDatabasePlaceholder(paths)

    let linkResult = 'skipped'

    if (options.link !== false) {
      linkResult = ensureLocalLink(paths, options.force)
    }

    writeInstallState(paths, options.link === false ? null : paths.cliLink)

    console.log(`${APP_NAME} local state is ready.`)
    console.log(`CLI link: ${linkResult}`)
    printPaths(paths)
  })

program
  .command('uninstall')
  .description(
    `Remove ${APP_NAME} local state without touching the repository working tree.`,
  )
  .option('--force', 'Skip interactive confirmation.')
  .option('--dry-run', 'Print what would be removed without deleting anything.')
  .action(async (options: { force?: boolean; dryRun?: boolean }) => {
    const paths = getAppPaths()
    const installState = readInstallState(paths)
    const shouldRemoveLink = canRemoveCliLink(paths.cliLink, installState)
    const actions = [
      `${existsSync(paths.root) ? 'remove' : 'keep'} ${paths.root}`,
      `${shouldRemoveLink ? 'remove' : 'keep'} ${paths.cliLink}`,
      `keep ${repoRoot}`,
    ]

    if (options.dryRun) {
      actions.forEach((action) => console.log(action))
      return
    }

    if (!options.force) {
      const confirmed = await confirmUninstall(paths)

      if (!confirmed) {
        console.log('Uninstall cancelled.')
        return
      }
    }

    if (shouldRemoveLink) {
      rmSync(paths.cliLink, { force: true })
    }

    if (existsSync(paths.root)) {
      guardDeletionTarget(paths.root)
      rmSync(paths.root, { recursive: true, force: true })
    }

    console.log(`${APP_NAME} local state removed.`)
    console.log(`Repository left untouched at ${repoRoot}`)
  })

program
  .command('status')
  .description(`Inspect ${APP_NAME} install state and tracked local paths.`)
  .action(async () => {
    const paths = getAppPaths()
    const installState = readInstallState(paths)

    console.log(`Product:       ${APP_NAME}`)
    console.log(
      `App data root: ${existsSync(paths.root) ? 'present' : 'missing'}`,
    )
    console.log(
      `Database:      ${hasDatabaseFile(paths) ? 'present' : 'missing'}`,
    )
    console.log(`CLI shim:      ${hasCliLink(paths) ? 'present' : 'missing'}`)
    console.log(`Install state: ${installState ? 'present' : 'missing'}`)

    if (installState) {
      console.log(`Installed at:  ${installState.installedAt}`)
      console.log(`Launcher path: ${installState.launcherPath}`)
    }

    await printGhCliStatus()
  })

program
  .command('paths')
  .description(`Print the deterministic local paths used by ${APP_NAME}.`)
  .action(() => {
    printPaths(getAppPaths())
  })

program
  .command('login')
  .description(`Inspect or start local GitHub CLI login for ${APP_NAME}.`)
  .option(
    '--add-account',
    'Start another gh auth login even when one account is already authenticated.',
  )
  .option('--check', 'Only print the current GitHub CLI auth status.')
  .action(async (options: { addAccount?: boolean; check?: boolean }) => {
    const status = await printGhCliStatus()

    if (!status.ghInstalled) {
      process.exitCode = 1
      return
    }

    if (options.check) {
      process.exitCode = status.authenticated ? 0 : 1
      return
    }

    if (status.authenticated && !options.addAccount) {
      console.log(`GitHub CLI login is already ready for ${APP_NAME}.`)
      return
    }

    console.log(
      options.addAccount
        ? 'Starting GitHub CLI web login to add another account...'
        : 'Starting GitHub CLI web login...',
    )

    const exitCode = runInteractiveGhLogin()

    if (exitCode !== 0) {
      process.exitCode = exitCode
      return
    }

    console.log('GitHub CLI login completed. Refreshing status...')
    const refreshedStatus = await printGhCliStatus()
    process.exitCode = refreshedStatus.authenticated ? 0 : 1
  })

program
  .command('ui')
  .description(
    `Launch the ${APP_NAME} production web UI and open it in your browser.`,
  )
  .option('--host <host>', 'Server host.', DEFAULT_UI_HOST)
  .option('--port <port>', 'Server port.', String(DEFAULT_UI_PORT))
  .option('--no-open', 'Start the UI without opening a browser window.')
  .option('--rebuild', 'Force rebuilding the production UI before serving it.')
  .action(
    async (options: {
      host?: string
      noOpen?: boolean
      port?: string
      rebuild?: boolean
    }) => {
      const requestedPort = Number.parseInt(
        options.port ?? String(DEFAULT_UI_PORT),
        10,
      )

      if (!Number.isInteger(requestedPort) || requestedPort <= 0) {
        throw new Error('Port must be a positive integer.')
      }

      console.log(`Starting ${APP_NAME} UI...`)
      ensureLocalRuntimeState()

      const launch = await launchUi({
        forceBuild: options.rebuild,
        host: options.host,
        noOpen: options.noOpen,
        port: requestedPort,
        repoRoot,
      })

      console.log(`UI ready at ${launch.url}`)

      let shuttingDown = false
      const shutdown = async () => {
        if (shuttingDown) {
          return
        }

        shuttingDown = true
        await launch.close()
        process.exit(0)
      }

      process.once('SIGINT', () => {
        void shutdown()
      })

      process.once('SIGTERM', () => {
        void shutdown()
      })
    },
  )

program
  .command('repos')
  .description('Repository discovery commands.')
  .command('list')
  .description('List repositories you can manage variables for.')
  .action(async () => {
    printRepositoryList(await listManageableRepositories())
  })

const varsCommand = program
  .command('vars')
  .description('Repository variable commands.')

varsCommand.command('list <repository>').action(async (repository: string) => {
  printVariableList(repository, await listRepositoryVariables(repository))
})

varsCommand
  .command('set <repository> <name> <value>')
  .action(async (repository: string, name: string, value: string) => {
    const result = await upsertRepositoryVariable(repository, name, value)

    console.log(
      `${result.created ? 'Created' : 'Updated'} ${result.variable.name} in ${repository}.`,
    )
    console.log(`Value: ${result.variable.value}`)
  })

varsCommand
  .command('delete <repository> <name>')
  .action(async (repository: string, name: string) => {
    await deleteRepositoryVariable(repository, name)
    console.log(`Deleted ${name} from ${repository}.`)
  })

const envsCommand = program
  .command('envs')
  .description('Planned environment commands.')

envsCommand.command('list <repository>').action(() => {
  printPlanned('Environment listing is planned but not wired yet.')
})

envsCommand.command('create <repository> <environmentName>').action(() => {
  printPlanned('Environment creation is planned but not wired yet.')
})

envsCommand.command('delete <repository> <environmentName>').action(() => {
  printPlanned('Environment deletion is planned but not wired yet.')
})

const envVarsCommand = program
  .command('env-vars')
  .description('Planned environment-variable commands.')

envVarsCommand.command('list <repository> <environmentName>').action(() => {
  printPlanned('Environment-variable listing is planned but not wired yet.')
})

envVarsCommand
  .command('set <repository> <environmentName> <name> <value>')
  .action(() => {
    printPlanned('Environment-variable mutation is planned but not wired yet.')
  })

envVarsCommand
  .command('delete <repository> <environmentName> <name>')
  .action(() => {
    printPlanned('Environment-variable deletion is planned but not wired yet.')
  })

try {
  await program.parseAsync(process.argv)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}

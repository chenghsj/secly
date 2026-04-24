import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  APP_SLUG,
  CLI_NAME,
  LEGACY_APP_SLUG,
  LEGACY_CLI_NAME,
} from '../lib/product'

function buildAppPaths(home: string, slug: string, cliName: string) {
  const root = join(home, 'Library', 'Application Support', slug)

  return {
    root,
    dataDir: join(root, 'data'),
    cacheDir: join(root, 'cache'),
    logsDir: join(root, 'logs'),
    databaseFile: join(root, 'data', `${slug}.sqlite`),
    installStateFile: join(root, 'install-state.json'),
    localBinDir: join(home, '.local', 'bin'),
    cliLink: join(home, '.local', 'bin', cliName),
  }
}

export function getAppPaths(home = homedir()) {
  return buildAppPaths(home, APP_SLUG, CLI_NAME)
}

export type AppPaths = ReturnType<typeof getAppPaths>

export function getLegacyAppPaths(home = homedir()) {
  return buildAppPaths(home, LEGACY_APP_SLUG, LEGACY_CLI_NAME)
}

function renameOrCopyPath(sourcePath: string, targetPath: string) {
  try {
    renameSync(sourcePath, targetPath)
    return
  } catch {
    cpSync(sourcePath, targetPath, { recursive: true })
    rmSync(sourcePath, { force: true, recursive: true })
  }
}

export function migrateLegacyAppDirectory(home = homedir()) {
  const paths = getAppPaths(home)
  const legacyPaths = getLegacyAppPaths(home)

  if (existsSync(paths.root) || !existsSync(legacyPaths.root)) {
    return {
      legacyPaths,
      migrated: false,
      paths,
    }
  }

  mkdirSync(dirname(paths.root), { recursive: true })
  renameOrCopyPath(legacyPaths.root, paths.root)

  const legacyDatabaseFile = join(paths.dataDir, `${LEGACY_APP_SLUG}.sqlite`)

  if (!existsSync(paths.databaseFile) && existsSync(legacyDatabaseFile)) {
    renameSync(legacyDatabaseFile, paths.databaseFile)
  }

  return {
    legacyPaths,
    migrated: true,
    paths,
  }
}

export function ensureAppDirectories(home = homedir()) {
  const { paths } = migrateLegacyAppDirectory(home)

  mkdirSync(paths.dataDir, { recursive: true })
  mkdirSync(paths.cacheDir, { recursive: true })
  mkdirSync(paths.logsDir, { recursive: true })

  return paths
}

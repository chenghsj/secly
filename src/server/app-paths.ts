import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { APP_SLUG, CLI_NAME } from '../lib/product'

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

export function ensureAppDirectories(home = homedir()) {
  const paths = getAppPaths(home)

  mkdirSync(paths.dataDir, { recursive: true })
  mkdirSync(paths.cacheDir, { recursive: true })
  mkdirSync(paths.logsDir, { recursive: true })

  return paths
}

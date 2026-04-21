import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { APP_SLUG, CLI_NAME } from '../lib/product'

export function getAppPaths(home = homedir()) {
  const root = join(home, 'Library', 'Application Support', APP_SLUG)

  return {
    root,
    dataDir: join(root, 'data'),
    cacheDir: join(root, 'cache'),
    logsDir: join(root, 'logs'),
    databaseFile: join(root, 'data', `${APP_SLUG}.sqlite`),
    installStateFile: join(root, 'install-state.json'),
    localBinDir: join(home, '.local', 'bin'),
    cliLink: join(home, '.local', 'bin', CLI_NAME),
  }
}

export type AppPaths = ReturnType<typeof getAppPaths>

export function ensureAppDirectories(home = homedir()) {
  const paths = getAppPaths(home)

  mkdirSync(paths.dataDir, { recursive: true })
  mkdirSync(paths.cacheDir, { recursive: true })
  mkdirSync(paths.logsDir, { recursive: true })

  return paths
}

import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getAppPaths,
  getLegacyAppPaths,
  migrateLegacyAppDirectory,
} from './app-paths'

describe('getAppPaths', () => {
  it('uses a deterministic app-data root under the supplied home directory', () => {
    const paths = getAppPaths('/tmp/secly-home')

    expect(paths.root).toBe('/tmp/secly-home/Library/Application Support/secly')
    expect(paths.dataDir).toBe(
      '/tmp/secly-home/Library/Application Support/secly/data',
    )
    expect(paths.cacheDir).toBe(
      '/tmp/secly-home/Library/Application Support/secly/cache',
    )
    expect(paths.logsDir).toBe(
      '/tmp/secly-home/Library/Application Support/secly/logs',
    )
    expect(paths.databaseFile).toBe(
      '/tmp/secly-home/Library/Application Support/secly/data/secly.sqlite',
    )
  })

  it('derives the local CLI shim path from the supplied home directory', () => {
    const paths = getAppPaths('/tmp/secly-home')

    expect(paths.localBinDir).toBe('/tmp/secly-home/.local/bin')
    expect(paths.cliLink).toBe('/tmp/secly-home/.local/bin/secly')
  })

  it('migrates the legacy app-data directory into the secly root', () => {
    const home = mkdtempSync(join(tmpdir(), 'secly-app-paths-'))

    try {
      const legacyPaths = getLegacyAppPaths(home)

      mkdirSync(legacyPaths.dataDir, { recursive: true })
      writeFileSync(legacyPaths.databaseFile, '', 'utf8')

      const migration = migrateLegacyAppDirectory(home)

      expect(migration.migrated).toBe(true)
      expect(existsSync(legacyPaths.root)).toBe(false)
      expect(existsSync(migration.paths.root)).toBe(true)
      expect(existsSync(migration.paths.databaseFile)).toBe(true)
    } finally {
      rmSync(home, { force: true, recursive: true })
    }
  })
})

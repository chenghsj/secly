import { describe, expect, it } from 'vitest'
import { getAppPaths } from './app-paths'

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
})

import { describe, expect, it } from 'vitest'
import { getAppPaths } from './app-paths'

describe('getAppPaths', () => {
  it('uses a deterministic app-data root under the supplied home directory', () => {
    const paths = getAppPaths('/tmp/gh-vardeck-home')

    expect(paths.root).toBe(
      '/tmp/gh-vardeck-home/Library/Application Support/gh-vardeck',
    )
    expect(paths.dataDir).toBe(
      '/tmp/gh-vardeck-home/Library/Application Support/gh-vardeck/data',
    )
    expect(paths.cacheDir).toBe(
      '/tmp/gh-vardeck-home/Library/Application Support/gh-vardeck/cache',
    )
    expect(paths.logsDir).toBe(
      '/tmp/gh-vardeck-home/Library/Application Support/gh-vardeck/logs',
    )
    expect(paths.databaseFile).toBe(
      '/tmp/gh-vardeck-home/Library/Application Support/gh-vardeck/data/gh-vardeck.sqlite',
    )
  })

  it('derives the local CLI shim path from the supplied home directory', () => {
    const paths = getAppPaths('/tmp/gh-vardeck-home')

    expect(paths.localBinDir).toBe('/tmp/gh-vardeck-home/.local/bin')
    expect(paths.cliLink).toBe('/tmp/gh-vardeck-home/.local/bin/ghdeck')
  })
})

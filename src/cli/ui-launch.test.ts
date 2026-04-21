import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  buildUiUrl,
  findAvailablePort,
  getStaticAssetFilePath,
  getUiBuildStatus,
  openBrowser,
  resolveNpmCommand,
} from './ui-launch'

describe('buildUiUrl', () => {
  it('maps 0.0.0.0 to a browser-safe localhost url', () => {
    expect(buildUiUrl('0.0.0.0', 3000)).toBe('http://127.0.0.1:3000')
  })
})

describe('findAvailablePort', () => {
  it('returns the first available port', async () => {
    const port = await findAvailablePort(3000, {
      host: '127.0.0.1',
      portCheck: async (_host, candidate) => candidate !== 3002,
    })

    expect(port).toBe(3002)
  })
})

describe('resolveNpmCommand', () => {
  it('uses npm.cmd on Windows', () => {
    expect(resolveNpmCommand('win32')).toBe('npm.cmd')
  })
})

describe('getUiBuildStatus', () => {
  it('reports missing when the build output is absent', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'ghdeck-ui-build-missing-'))

    try {
      mkdirSync(join(repoRoot, 'src'), { recursive: true })
      writeFileSync(join(repoRoot, 'src/index.ts'), 'export {}\n', 'utf8')
      writeFileSync(join(repoRoot, 'package.json'), '{}\n', 'utf8')
      writeFileSync(
        join(repoRoot, 'vite.config.ts'),
        'export default {}\n',
        'utf8',
      )

      expect(getUiBuildStatus(repoRoot)).toBe('missing')
    } finally {
      rmSync(repoRoot, { force: true, recursive: true })
    }
  })

  it('reports stale when a source file is newer than the build output', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'ghdeck-ui-build-stale-'))

    try {
      const sourceDir = join(repoRoot, 'src')
      const sourceFile = join(repoRoot, 'src/index.ts')
      const serverEntry = join(repoRoot, 'dist/server/server.js')
      const clientAsset = join(repoRoot, 'dist/client/assets/app.js')
      const packageJsonPath = join(repoRoot, 'package.json')
      const viteConfigPath = join(repoRoot, 'vite.config.ts')
      const olderTime = new Date(Date.now() - 10_000)
      const newerTime = new Date(Date.now() - 1_000)

      mkdirSync(sourceDir, { recursive: true })
      mkdirSync(dirname(serverEntry), { recursive: true })
      mkdirSync(dirname(clientAsset), { recursive: true })
      writeFileSync(sourceFile, 'export {}\n', 'utf8')
      writeFileSync(serverEntry, 'export default { fetch() {} }\n', 'utf8')
      writeFileSync(clientAsset, 'console.log("asset")\n', 'utf8')
      writeFileSync(packageJsonPath, '{}\n', 'utf8')
      writeFileSync(viteConfigPath, 'export default {}\n', 'utf8')

      utimesSync(serverEntry, olderTime, olderTime)
      utimesSync(clientAsset, olderTime, olderTime)
      utimesSync(packageJsonPath, olderTime, olderTime)
      utimesSync(viteConfigPath, olderTime, olderTime)
      utimesSync(sourceDir, olderTime, olderTime)
      utimesSync(sourceFile, newerTime, newerTime)

      expect(getUiBuildStatus(repoRoot)).toBe('stale')
    } finally {
      rmSync(repoRoot, { force: true, recursive: true })
    }
  })

  it('reports ready when the build output is newer than the source tree', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'ghdeck-ui-build-ready-'))

    try {
      const sourceDir = join(repoRoot, 'src')
      const sourceFile = join(repoRoot, 'src/index.ts')
      const serverEntry = join(repoRoot, 'dist/server/server.js')
      const clientAsset = join(repoRoot, 'dist/client/assets/app.js')
      const packageJsonPath = join(repoRoot, 'package.json')
      const viteConfigPath = join(repoRoot, 'vite.config.ts')
      const olderTime = new Date(Date.now() - 10_000)
      const newerTime = new Date(Date.now() - 1_000)

      mkdirSync(sourceDir, { recursive: true })
      mkdirSync(dirname(serverEntry), { recursive: true })
      mkdirSync(dirname(clientAsset), { recursive: true })
      writeFileSync(sourceFile, 'export {}\n', 'utf8')
      writeFileSync(serverEntry, 'export default { fetch() {} }\n', 'utf8')
      writeFileSync(clientAsset, 'console.log("asset")\n', 'utf8')
      writeFileSync(packageJsonPath, '{}\n', 'utf8')
      writeFileSync(viteConfigPath, 'export default {}\n', 'utf8')

      utimesSync(sourceFile, olderTime, olderTime)
      utimesSync(packageJsonPath, olderTime, olderTime)
      utimesSync(viteConfigPath, olderTime, olderTime)
      utimesSync(sourceDir, olderTime, olderTime)
      utimesSync(serverEntry, newerTime, newerTime)
      utimesSync(clientAsset, newerTime, newerTime)

      expect(getUiBuildStatus(repoRoot)).toBe('ready')
    } finally {
      rmSync(repoRoot, { force: true, recursive: true })
    }
  })
})

describe('getStaticAssetFilePath', () => {
  it('returns a file path for assets under dist/client', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'ghdeck-ui-static-'))
    const clientRoot = join(repoRoot, 'dist/client')
    const assetPath = join(clientRoot, 'assets/app.js')

    try {
      mkdirSync(dirname(assetPath), { recursive: true })
      writeFileSync(assetPath, 'console.log("asset")\n', 'utf8')

      expect(getStaticAssetFilePath('/assets/app.js', clientRoot)).toBe(
        assetPath,
      )
    } finally {
      rmSync(repoRoot, { force: true, recursive: true })
    }
  })

  it('blocks path traversal outside dist/client', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'ghdeck-ui-static-traversal-'))
    const clientRoot = join(repoRoot, 'dist/client')

    try {
      mkdirSync(clientRoot, { recursive: true })

      expect(getStaticAssetFilePath('/../secret.txt', clientRoot)).toBeNull()
      expect(
        getStaticAssetFilePath('/%2e%2e/secret.txt', clientRoot),
      ).toBeNull()
    } finally {
      rmSync(repoRoot, { force: true, recursive: true })
    }
  })
})

describe('openBrowser', () => {
  it('uses open on macOS', () => {
    const unref = vi.fn()
    const spawnRunner = vi.fn(() => ({ unref }) as any)

    openBrowser('http://127.0.0.1:3000', {
      platform: 'darwin',
      spawnRunner,
    })

    expect(spawnRunner).toHaveBeenCalledWith(
      'open',
      ['http://127.0.0.1:3000'],
      {
        detached: true,
        stdio: 'ignore',
      },
    )
    expect(unref).toHaveBeenCalled()
  })
})

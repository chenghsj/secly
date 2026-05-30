import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_UI_PORT,
  buildUiUrl,
  findAvailablePort,
  getStaticAssetFilePath,
  getUiBuildStatus,
  launchUi,
  openBrowser,
  resolveNpmCommand,
} from './ui-launch'

import http from 'node:http'

describe('buildUiUrl', () => {
  it('uses the product default high port when none is specified', () => {
    expect(buildUiUrl()).toBe('http://127.0.0.1:43127')
  })

  it('maps 0.0.0.0 to a browser-safe localhost url', () => {
    expect(buildUiUrl('0.0.0.0', 3000)).toBe('http://127.0.0.1:3000')
  })
})

describe('DEFAULT_UI_PORT', () => {
  it('starts the production UI on the reserved high port range', () => {
    expect(DEFAULT_UI_PORT).toBe(43127)
  })
})

describe('findAvailablePort', () => {
  it('returns the requested port when it is free', async () => {
    const port = await findAvailablePort(3000, {
      host: '127.0.0.1',
      portInspector: async () => 'free',
    })

    expect(port).toBe(3000)
  })

  it('fails when the requested port is already occupied', async () => {
    await expect(
      findAvailablePort(43127, {
        host: '127.0.0.1',
        portInspector: async () => 'occupied',
      }),
    ).rejects.toThrow('Port 43127 is already in use.')
  })

  it('fails when Secly UI is already running on the requested port', async () => {
    await expect(
      findAvailablePort(43127, {
        host: '127.0.0.1',
        portInspector: async () => 'secly',
      }),
    ).rejects.toThrow('Secly UI is already running at http://127.0.0.1:43127.')
  })
})

describe('resolveNpmCommand', () => {
  it('uses npm.cmd on Windows', () => {
    expect(resolveNpmCommand('win32')).toBe('npm.cmd')
  })
})

describe('getUiBuildStatus', () => {
  it('reports missing when the build output is absent', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'secly-ui-build-missing-'))

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
    const repoRoot = mkdtempSync(join(tmpdir(), 'secly-ui-build-stale-'))

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
    const repoRoot = mkdtempSync(join(tmpdir(), 'secly-ui-build-ready-'))

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
    const repoRoot = mkdtempSync(join(tmpdir(), 'secly-ui-static-'))
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
    const repoRoot = mkdtempSync(join(tmpdir(), 'secly-ui-static-traversal-'))
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

function httpRequest(
  url: string,
  options: http.RequestOptions & { body?: string } = {},
): Promise<{
  status: number
  headers: http.IncomingHttpHeaders
  text: string
}> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const reqOptions: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method ?? 'GET',
      headers: options.headers ?? {},
    }

    const req = http.request(reqOptions, (res) => {
      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          text: data,
        })
      })
    })

    req.on('error', reject)

    if (options.body) {
      req.write(options.body)
    }
    req.end()
  })
}

describe('launchUi security validation', () => {
  let repoRoot: string
  let clientRoot: string
  let serverEntry: string
  const testPort = 45127

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'secly-ui-launch-test-'))
    clientRoot = join(repoRoot, 'dist/client')
    serverEntry = join(repoRoot, 'dist/server/server.js')

    mkdirSync(clientRoot, { recursive: true })
    mkdirSync(dirname(serverEntry), { recursive: true })

    // Bypasses the UI build
    writeFileSync(join(repoRoot, '.secly-standalone'), '', 'utf8')
    writeFileSync(
      serverEntry,
      `export default {
        fetch: async (request) => {
          return new Response('Fetch response ok', { status: 200 })
        }
      }`,
      'utf8',
    )
  })

  afterEach(() => {
    rmSync(repoRoot, { force: true, recursive: true })
  })

  it('sets expected security headers and validates Host and Origin headers', async () => {
    const launchResult = await launchUi({
      host: '127.0.0.1',
      port: testPort,
      noOpen: true,
      repoRoot,
    })

    try {
      // 1. Test valid request
      const validRes = await httpRequest(
        `http://127.0.0.1:${testPort}/__secly__/health`,
        {
          headers: {
            Host: `127.0.0.1:${testPort}`,
          },
        },
      )
      expect(validRes.status).toBe(204)
      expect(validRes.headers['x-secly-ui']).toBe('1')
      expect(validRes.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(validRes.headers['x-content-type-options']).toBe('nosniff')

      // 2. Test invalid Host header (DNS Rebinding protection)
      const invalidHostRes = await httpRequest(
        `http://127.0.0.1:${testPort}/__secly__/health`,
        {
          headers: {
            Host: 'attacker.com',
          },
        },
      )
      expect(invalidHostRes.status).toBe(400)
      expect(invalidHostRes.text).toContain('Unrecognized Host header')

      // 3. Test invalid Origin header on POST request (CSRF protection)
      const invalidOriginRes = await httpRequest(
        `http://127.0.0.1:${testPort}/_server`,
        {
          method: 'POST',
          headers: {
            Host: `127.0.0.1:${testPort}`,
            Origin: 'http://evil.com',
          },
        },
      )
      expect(invalidOriginRes.status).toBe(403)
      expect(invalidOriginRes.text).toContain('Cross-Origin POST blocked')

      // 4. Test valid Origin header on POST request
      const validOriginRes = await httpRequest(
        `http://127.0.0.1:${testPort}/_server`,
        {
          method: 'POST',
          headers: {
            Host: `127.0.0.1:${testPort}`,
            Origin: `http://127.0.0.1:${testPort}`,
          },
        },
      )
      expect(validOriginRes.status).toBe(200)
      expect(validOriginRes.text).toBe('Fetch response ok')
    } finally {
      await launchResult.close()
    }
  })
})

import { spawn } from 'node:child_process'
import type { ChildProcess, SpawnOptions } from 'node:child_process'
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import net from 'node:net'
import { extname, relative, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'

export const DEFAULT_UI_HOST = '127.0.0.1'
export const DEFAULT_UI_PORT = 3000

const STATIC_CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

type SpawnRunner = (
  command: string,
  args: string[],
  options: SpawnOptions,
) => ChildProcess

type OpenBrowserRunner = (
  targetUrl: string,
  options?: {
    platform?: NodeJS.Platform
    spawnRunner?: SpawnRunner
  },
) => void

type PortCheck = (host: string, port: number) => Promise<boolean>

type UiRuntimePaths = {
  clientRoot: string
  serverEntry: string
  sourceEntries: string[]
}

export type UiLaunchOptions = {
  forceBuild?: boolean
  host?: string
  noOpen?: boolean
  openBrowserRunner?: OpenBrowserRunner
  platform?: NodeJS.Platform
  port?: number
  repoRoot: string
  spawnRunner?: SpawnRunner
}

export type UiBuildStatus = 'missing' | 'ready' | 'stale'

export type UiLaunchResult = {
  close: () => Promise<void>
  host: string
  port: number
  server: Server
  url: string
}

function defaultSpawnRunner(
  command: string,
  args: string[],
  options: SpawnOptions,
) {
  return spawn(command, args, options)
}

function normalizeBrowserHost(host: string) {
  return host === '0.0.0.0' ? '127.0.0.1' : host
}

function getUiRuntimePaths(repoRoot: string): UiRuntimePaths {
  return {
    clientRoot: resolve(repoRoot, 'dist/client'),
    serverEntry: resolve(repoRoot, 'dist/server/server.js'),
    sourceEntries: [
      resolve(repoRoot, 'src'),
      resolve(repoRoot, 'public'),
      resolve(repoRoot, 'package.json'),
      resolve(repoRoot, 'vite.config.ts'),
    ],
  }
}

function getLatestModifiedTime(targetPath: string): number {
  if (!existsSync(targetPath)) {
    return 0
  }

  const stats = statSync(targetPath)

  if (!stats.isDirectory()) {
    return stats.mtimeMs
  }

  return readdirSync(targetPath, { withFileTypes: true }).reduce(
    (latest, entry) => {
      return Math.max(
        latest,
        getLatestModifiedTime(resolve(targetPath, entry.name)),
      )
    },
    stats.mtimeMs,
  )
}

function getOrigin(
  request: IncomingMessage,
  fallbackHost: string,
  fallbackPort: number,
) {
  const hostHeader = request.headers.host

  if (hostHeader) {
    return `http://${hostHeader}`
  }

  return buildUiUrl(fallbackHost, fallbackPort)
}

function createFetchRequest(
  request: IncomingMessage,
  fallbackHost: string,
  fallbackPort: number,
) {
  const requestUrl = new URL(
    request.url ?? '/',
    getOrigin(request, fallbackHost, fallbackPort),
  )
  const headers = new Headers()

  Object.entries(request.headers).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        headers.append(name, entry)
      })
      return
    }

    if (typeof value === 'string') {
      headers.append(name, value)
    }
  })

  const method = request.method ?? 'GET'
  const init: RequestInit & { duplex?: 'half' } = {
    headers,
    method,
  }

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = Readable.toWeb(request as unknown as Readable) as BodyInit
    init.duplex = 'half'
  }

  return new Request(requestUrl, init)
}

function getSetCookieValues(headers: Headers) {
  const headersWithSetCookie = headers as Headers & {
    getSetCookie?: () => string[]
  }

  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    return headersWithSetCookie.getSetCookie()
  }

  const value = headers.get('set-cookie')
  return value ? [value] : []
}

function isStaticAssetPathInsideClientRoot(
  clientRoot: string,
  candidatePath: string,
) {
  const relativePath = relative(clientRoot, candidatePath)
  return relativePath !== '' && !relativePath.startsWith('..')
}

function getStaticAssetContentType(assetPath: string) {
  return (
    STATIC_CONTENT_TYPES[extname(assetPath).toLowerCase()] ??
    'application/octet-stream'
  )
}

async function sendFetchResponse(
  response: Response,
  requestMethod: string,
  reply: ServerResponse,
) {
  reply.statusCode = response.status
  reply.statusMessage = response.statusText

  const setCookieValues = getSetCookieValues(response.headers)

  response.headers.forEach((value, name) => {
    if (name.toLowerCase() === 'set-cookie') {
      return
    }

    reply.setHeader(name, value)
  })

  if (setCookieValues.length > 0) {
    reply.setHeader('set-cookie', setCookieValues)
  }

  if (requestMethod === 'HEAD' || !response.body) {
    reply.end()
    return
  }

  await pipeline(Readable.fromWeb(response.body as ReadableStream), reply)
}

async function sendStaticAsset(
  assetPath: string,
  pathname: string,
  requestMethod: string,
  reply: ServerResponse,
) {
  reply.statusCode = 200
  reply.setHeader('content-type', getStaticAssetContentType(assetPath))

  if (pathname.startsWith('/assets/')) {
    reply.setHeader('cache-control', 'public, max-age=31536000, immutable')
  }

  if (requestMethod === 'HEAD') {
    reply.end()
    return
  }

  await pipeline(createReadStream(assetPath), reply)
}

async function runNpmScript(
  scriptName: string,
  options: {
    platform?: NodeJS.Platform
    repoRoot: string
    spawnRunner?: SpawnRunner
  },
) {
  const spawnRunner = options.spawnRunner ?? defaultSpawnRunner
  const child = spawnRunner(
    resolveNpmCommand(options.platform),
    ['run', scriptName],
    {
      cwd: options.repoRoot,
      env: process.env,
      stdio: 'inherit',
    },
  )

  await new Promise<void>((fulfill, rejectPromise) => {
    child.once('error', rejectPromise)
    child.once('exit', (code) => {
      if (code === 0) {
        fulfill()
        return
      }

      rejectPromise(
        new Error(`npm run ${scriptName} exited with code ${code ?? 1}.`),
      )
    })
  })
}

async function ensureUiBuild(options: {
  forceBuild?: boolean
  platform?: NodeJS.Platform
  repoRoot: string
  spawnRunner?: SpawnRunner
}) {
  const buildStatus = options.forceBuild
    ? 'stale'
    : getUiBuildStatus(options.repoRoot)

  if (buildStatus === 'ready') {
    return
  }

  console.log(
    buildStatus === 'missing'
      ? 'Production UI build not found. Running npm run build...'
      : 'Production UI build is stale. Running npm run build...',
  )

  await runNpmScript('build', {
    platform: options.platform,
    repoRoot: options.repoRoot,
    spawnRunner: options.spawnRunner,
  })
}

async function startProductionUiServer(configuration: {
  host: string
  port: number
  repoRoot: string
}) {
  const runtimePaths = getUiRuntimePaths(configuration.repoRoot)
  const serverEntryModule = await import(
    pathToFileURL(runtimePaths.serverEntry).href
  )
  const fetchHandler = serverEntryModule.default?.fetch as
    | ((request: Request) => Promise<Response>)
    | undefined

  if (typeof fetchHandler !== 'function') {
    throw new Error(
      'Built server entry does not export a usable fetch handler.',
    )
  }

  const server = createServer(async (request, reply) => {
    try {
      const requestUrl = new URL(
        request.url ?? '/',
        getOrigin(request, configuration.host, configuration.port),
      )
      const staticAssetPath = getStaticAssetFilePath(
        requestUrl.pathname,
        runtimePaths.clientRoot,
      )

      if (staticAssetPath) {
        await sendStaticAsset(
          staticAssetPath,
          requestUrl.pathname,
          request.method ?? 'GET',
          reply,
        )
        return
      }

      const response = await fetchHandler(
        createFetchRequest(request, configuration.host, configuration.port),
      )

      await sendFetchResponse(response, request.method ?? 'GET', reply)
    } catch (error) {
      if (!reply.headersSent) {
        reply.statusCode = 500
        reply.setHeader('content-type', 'text/plain; charset=utf-8')
      }

      const message =
        error instanceof Error ? error.message : 'Unknown UI server error.'
      reply.end(`GH VarDeck UI server error: ${message}`)
    }
  })

  await new Promise<void>((fulfill, rejectPromise) => {
    server.once('error', rejectPromise)
    server.listen(configuration.port, configuration.host, () => {
      server.off('error', rejectPromise)
      fulfill()
    })
  })

  return server
}

async function canConnect(host: string, port: number) {
  return await new Promise<boolean>((fulfill) => {
    const socket = net.connect({ host: normalizeBrowserHost(host), port })

    socket.once('connect', () => {
      socket.destroy()
      fulfill(true)
    })

    socket.once('error', () => {
      socket.destroy()
      fulfill(false)
    })
  })
}

export function resolveNpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'npm.cmd' : 'npm'
}

export function buildUiUrl(host = DEFAULT_UI_HOST, port = DEFAULT_UI_PORT) {
  return `http://${normalizeBrowserHost(host)}:${port}`
}

export function getUiBuildStatus(repoRoot: string): UiBuildStatus {
  const runtimePaths = getUiRuntimePaths(repoRoot)

  if (
    !existsSync(runtimePaths.clientRoot) ||
    !existsSync(runtimePaths.serverEntry)
  ) {
    return 'missing'
  }

  const buildTime = statSync(runtimePaths.serverEntry).mtimeMs
  const sourceTime = Math.max(
    ...runtimePaths.sourceEntries.map((entry) => getLatestModifiedTime(entry)),
  )

  return sourceTime > buildTime ? 'stale' : 'ready'
}

export function openBrowser(
  targetUrl: string,
  options?: {
    platform?: NodeJS.Platform
    spawnRunner?: SpawnRunner
  },
) {
  const platform = options?.platform ?? process.platform
  const spawnRunner = options?.spawnRunner ?? defaultSpawnRunner

  if (platform === 'darwin') {
    spawnRunner('open', [targetUrl], {
      detached: true,
      stdio: 'ignore',
    }).unref()
    return
  }

  if (platform === 'win32') {
    spawnRunner('cmd', ['/c', 'start', '', targetUrl], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    }).unref()
    return
  }

  spawnRunner('xdg-open', [targetUrl], {
    detached: true,
    stdio: 'ignore',
  }).unref()
}

export function getStaticAssetFilePath(
  urlPathname: string,
  clientRoot: string,
) {
  if (urlPathname === '/' || urlPathname.endsWith('/')) {
    return null
  }

  let decodedPath = urlPathname

  try {
    decodedPath = decodeURIComponent(urlPathname)
  } catch {
    return null
  }

  const candidatePath = resolve(clientRoot, `.${decodedPath}`)

  if (!isStaticAssetPathInsideClientRoot(clientRoot, candidatePath)) {
    return null
  }

  if (!existsSync(candidatePath) || !statSync(candidatePath).isFile()) {
    return null
  }

  return candidatePath
}

export async function findAvailablePort(
  startingPort = DEFAULT_UI_PORT,
  options?: {
    host?: string
    portCheck?: PortCheck
  },
) {
  const host = options?.host ?? DEFAULT_UI_HOST
  const portCheck = options?.portCheck ?? canConnect

  for (let port = startingPort; port < startingPort + 50; port += 1) {
    const inUse = await portCheck(host, port)

    if (!inUse) {
      return port
    }
  }

  throw new Error(`Could not find a free port starting at ${startingPort}.`)
}

export async function launchUi(
  options: UiLaunchOptions,
): Promise<UiLaunchResult> {
  await ensureUiBuild({
    forceBuild: options.forceBuild,
    platform: options.platform,
    repoRoot: options.repoRoot,
    spawnRunner: options.spawnRunner,
  })

  const host = options.host ?? DEFAULT_UI_HOST
  const port = await findAvailablePort(options.port ?? DEFAULT_UI_PORT, {
    host,
  })
  const spawnRunner = options.spawnRunner ?? defaultSpawnRunner
  const browserUrl = buildUiUrl(host, port)
  const server = await startProductionUiServer({
    host,
    port,
    repoRoot: options.repoRoot,
  })

  if (!options.noOpen) {
    const browserRunner = options.openBrowserRunner ?? openBrowser
    browserRunner(browserUrl, {
      platform: options.platform,
      spawnRunner,
    })
  }

  return {
    close: async () => {
      await new Promise<void>((fulfill, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error)
            return
          }

          fulfill()
        })
      })
    },
    host,
    port,
    server,
    url: browserUrl,
  }
}

#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const launcherFile = realpathSync(fileURLToPath(import.meta.url))
const binDir = dirname(launcherFile)
const bundledEntrypoint = resolve(binDir, '../src/cli/run-cli.js')
const sourceEntrypoint = resolve(binDir, '../src/cli/run-cli.ts')

const usesBundledRuntime = existsSync(bundledEntrypoint)

const result = spawnSync(
  process.execPath,
  usesBundledRuntime
    ? [bundledEntrypoint, ...process.argv.slice(2)]
    : ['--import', 'tsx', sourceEntrypoint, ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  },
)

process.exit(result.status ?? 1)

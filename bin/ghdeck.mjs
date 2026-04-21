#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const binDir = dirname(currentFile)
const entrypoint = resolve(binDir, '../src/cli/run-cli.ts')

const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', entrypoint, ...process.argv.slice(2)],
    {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
    },
)

process.exit(result.status ?? 1)

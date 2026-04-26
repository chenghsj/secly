#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'
import {
    cpSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const scriptDir = dirname(currentFile)
const repoRoot = resolve(scriptDir, '..')
const outputRoot = resolve(repoRoot, 'dist/package')
const runtimeOutputFile = resolve(outputRoot, 'src/cli/run-cli.mjs')
const bundledServerOutputFile = resolve(outputRoot, 'dist/server/server.js')
const rootPackageJson = JSON.parse(
    readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
)

function resolveNpmCommand () {
    return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function runCommand (command, args) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        env: process.env,
        stdio: 'inherit',
    })

    if (result.status !== 0) {
        process.exit(result.status ?? 1)
    }
}

function createStandalonePackageJson () {
    return {
        name: rootPackageJson.name,
        version: rootPackageJson.version ?? '0.0.0-dev',
        private: false,
        type: 'module',
        description: rootPackageJson.description ?? 'Standalone Secly runtime',
        bin: {
            secly: './bin/secly.mjs',
        },
        engines: {
            node: '>=20',
        },
    }
}

runCommand(resolveNpmCommand(), ['run', 'build'])

rmSync(outputRoot, { force: true, recursive: true })
mkdirSync(resolve(outputRoot, 'bin'), { recursive: true })
mkdirSync(resolve(outputRoot, 'src/cli'), { recursive: true })
mkdirSync(resolve(outputRoot, 'dist/server'), { recursive: true })
mkdirSync(resolve(outputRoot, 'build/Release'), { recursive: true })

await build({
    bundle: true,
    banner: {
        js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url); import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __dirnameFunc } from 'node:path'; const __filename = __fileURLToPath(import.meta.url); const __dirname = __dirnameFunc(__filename);",
    },
    format: 'esm',
    outfile: runtimeOutputFile,
    platform: 'node',
    plugins: [
        {
            name: 'standalone-request-abort-alias',
            setup (esbuildBuild) {
                esbuildBuild.onResolve(
                    {
                        filter: /^\.\/request-abort\.server$/,
                    },
                    (args) => {
                        if (!args.importer.includes('/src/server/')) {
                            return null
                        }

                        return {
                            path: resolve(scriptDir, 'standalone/request-abort.server.ts'),
                        }
                    },
                )
            },
        },
    ],
    sourcemap: false,
    target: 'node20',
    tsconfig: resolve(repoRoot, 'tsconfig.json'),
    entryPoints: [resolve(repoRoot, 'src/cli/run-cli.ts')],
})

await build({
    bundle: true,
    banner: {
        js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url); import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __dirnameFunc } from 'node:path'; const __filename = __fileURLToPath(import.meta.url); const __dirname = __dirnameFunc(__filename);",
    },
    format: 'esm',
    outfile: bundledServerOutputFile,
    platform: 'node',
    sourcemap: false,
    target: 'node20',
    entryPoints: [resolve(repoRoot, 'dist/server/server.js')],
})

cpSync(resolve(repoRoot, 'bin/secly.mjs'), resolve(outputRoot, 'bin/secly.mjs'))
cpSync(resolve(repoRoot, 'dist/client'), resolve(outputRoot, 'dist/client'), {
    recursive: true,
})
cpSync(resolve(repoRoot, 'dist/server/assets'), resolve(outputRoot, 'dist/server/assets'), {
    recursive: true,
})
cpSync(
    resolve(repoRoot, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node'),
    resolve(outputRoot, 'build/Release/better_sqlite3.node'),
)
cpSync(resolve(repoRoot, 'README.md'), resolve(outputRoot, 'README.md'))
writeFileSync(resolve(outputRoot, '.secly-standalone'), '', 'utf8')

writeFileSync(
    resolve(outputRoot, 'package.json'),
    `${JSON.stringify(createStandalonePackageJson(), null, 2)}\n`,
    'utf8',
)

console.log(`Standalone package ready at ${outputRoot}`)
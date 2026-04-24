#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import {
    cpSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const scriptDir = dirname(currentFile)
const repoRoot = resolve(scriptDir, '..')
const standaloneRoot = resolve(repoRoot, 'dist/package')
const releaseRoot = resolve(repoRoot, 'dist/release')
const rootPackageJson = JSON.parse(
    readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
)

const version = rootPackageJson.version ?? '0.1.0'
const artifactBaseName = `secly-${version}-standalone`
const stagingRoot = resolve(releaseRoot, artifactBaseName)
const tarballPath = resolve(releaseRoot, `${artifactBaseName}.tar.gz`)
const checksumPath = resolve(releaseRoot, `${artifactBaseName}.sha256`)

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

runCommand(resolveNpmCommand(), ['run', 'build:standalone'])

rmSync(stagingRoot, { force: true, recursive: true })
mkdirSync(releaseRoot, { recursive: true })
cpSync(standaloneRoot, stagingRoot, { recursive: true })

runCommand('tar', [
    '-czf',
    tarballPath,
    '-C',
    releaseRoot,
    artifactBaseName,
])

const sha256 = createHash('sha256')
    .update(readFileSync(tarballPath))
    .digest('hex')

writeFileSync(checksumPath, `${sha256}  ${basename(tarballPath)}\n`, 'utf8')
rmSync(stagingRoot, { force: true, recursive: true })

console.log(`Release tarball ready at ${tarballPath}`)
console.log(`SHA256 written to ${checksumPath}`)
console.log(`SHA256: ${sha256}`)
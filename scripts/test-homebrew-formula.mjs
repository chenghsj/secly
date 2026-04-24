#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const scriptDir = dirname(currentFile)
const repoRoot = resolve(scriptDir, '..')
const rootPackageJson = JSON.parse(
    readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
)

const version = rootPackageJson.version ?? '0.1.0'
const artifactBaseName = `secly-${version}-standalone`
const tarballPath = resolve(
    repoRoot,
    'dist/release',
    `${artifactBaseName}.tar.gz`,
)
const formulaPath = resolve(repoRoot, 'dist/release/homebrew/secly.rb')
const formulaHomepage =
    process.env.SECLY_HOMEBREW_HOMEPAGE ??
    rootPackageJson.homepage ??
    'https://example.com/secly'
const tapOwner = 'secly'
const tapRepo = `local-test-${process.pid}-${Date.now()}`
const testHome = mkdtempSync(resolve(tmpdir(), 'secly-homebrew-test-'))
const stagedReleaseRoot = mkdtempSync(
    resolve(tmpdir(), 'secly-homebrew-release-'),
)
const stagedTarballPath = resolve(stagedReleaseRoot, basename(tarballPath))
const brewEnv = {
    ...process.env,
    HOMEBREW_NO_ANALYTICS: '1',
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_ENV_HINTS: '1',
    HOMEBREW_NO_INSTALL_CLEANUP: '1',
}

function resolveNpmCommand () {
    return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function runCommand (command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        env: options.env ?? process.env,
        stdio: options.stdio ?? 'inherit',
    })

    if (result.status !== 0) {
        throw new Error(
            `${command} ${args.join(' ')} exited with code ${result.status ?? 1}.`,
        )
    }
}

function readCommandOutput (command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        env: options.env ?? process.env,
        encoding: 'utf8',
        stdio: 'pipe',
    })

    if (result.status !== 0) {
        throw new Error(
            `${command} ${args.join(' ')} exited with code ${result.status ?? 1}.`,
        )
    }

    return result.stdout.trim()
}

function isSeclyInstalled () {
    const result = spawnSync('brew', ['list', '--formula', 'secly'], {
        env: brewEnv,
        stdio: 'ignore',
    })

    return result.status === 0
}

function createTemporaryTap () {
    const brewRepository = readCommandOutput('brew', ['--repository'], {
        env: brewEnv,
    })
    const tapRoot = resolve(
        brewRepository,
        'Library/Taps',
        tapOwner,
        `homebrew-${tapRepo}`,
    )
    const tapFormulaPath = resolve(tapRoot, 'Formula/secly.rb')

    mkdirSync(resolve(tapRoot, 'Formula'), { recursive: true })
    cpSync(formulaPath, tapFormulaPath)

    return {
        tapFormulaPath,
        tapRoot,
    }
}

if (isSeclyInstalled()) {
    throw new Error(
        'Homebrew formula "secly" is already installed. Uninstall it before running npm run test:homebrew.',
    )
}

runCommand(resolveNpmCommand(), ['run', 'build:release'])
cpSync(tarballPath, stagedTarballPath)
runCommand(process.execPath, [
    resolve(scriptDir, 'build-homebrew-formula.mjs'),
    '--url',
    pathToFileURL(stagedTarballPath).href,
    '--homepage',
    formulaHomepage,
])

const { tapFormulaPath, tapRoot } = createTemporaryTap()
let shouldUninstall = false

try {
    runCommand(
        'brew',
        ['install', '--formula', '--ignore-dependencies', tapFormulaPath],
        {
            env: brewEnv,
        },
    )
    shouldUninstall = true

    const installedPrefix = readCommandOutput('brew', ['--prefix', 'secly'], {
        env: brewEnv,
    })
    const installedCli = resolve(installedPrefix, 'bin/secly')
    const pathsOutput = readCommandOutput(installedCli, ['paths'], {
        env: {
            ...process.env,
            HOME: testHome,
        },
    })

    if (!pathsOutput.includes('App data root:')) {
        throw new Error('Installed Homebrew CLI did not print the expected paths output.')
    }

    console.log(pathsOutput)
    console.log('Homebrew formula install/smoke-test flow passed.')
} finally {
    if (shouldUninstall || isSeclyInstalled()) {
        runCommand('brew', ['uninstall', '--formula', 'secly'], {
            env: brewEnv,
        })
    }

    rmSync(tapRoot, { force: true, recursive: true })
    rmSync(testHome, { force: true, recursive: true })
    rmSync(stagedReleaseRoot, { force: true, recursive: true })
}
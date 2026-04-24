#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const scriptDir = dirname(currentFile)
const repoRoot = resolve(scriptDir, '..')
const releaseRoot = resolve(repoRoot, 'dist/release')
const tapOutputRoot = resolve(releaseRoot, 'homebrew-tap')
const tapFormulaOutputPath = resolve(tapOutputRoot, 'Formula/secly.rb')
const rootPackageJson = JSON.parse(
    readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
)

const version = rootPackageJson.version ?? '0.0.0-dev'
const artifactBaseName = `secly-${version}-standalone`

function parseArgs (argv) {
    const values = new Map()

    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index]

        if (!argument.startsWith('--')) {
            continue
        }

        const key = argument.slice(2)
        const value = argv[index + 1]

        if (!value || value.startsWith('--')) {
            throw new Error(`Missing value for --${key}.`)
        }

        values.set(key, value)
        index += 1
    }

    return values
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

function parseTap (input) {
    const [owner, repo] = input.split('/')

    if (!owner || !repo || input.split('/').length !== 2) {
        throw new Error(
            'Usage: npm run build:tap -- (--url <hosted-tarball-url> | --github-repo <owner/repo>) --tap <owner/repo> [--release-tag <tag>] [--homepage <homepage-url>].',
        )
    }

    return {
        owner,
        repo,
        tap: `${owner}/${repo}`,
    }
}

function createTapReadme ({ homepage, projectRepo, tap }) {
    return `# ${tap}

Official Homebrew tap for Secly.

This repository contains the Homebrew formula for installing Secly from the command line.

## Install

\`\`\`bash
brew tap ${tap}
brew install secly
\`\`\`

## Upgrade

\`\`\`bash
brew upgrade secly
\`\`\`

## Uninstall

\`\`\`bash
brew uninstall secly
\`\`\`

## Maintainers

After publishing a new Secly release artifact, regenerate the tap scaffold from the main project repository and copy the updated files into this tap repository.

## Project

- Project: ${homepage}
- Releases: ${projectRepo ? `https://github.com/${projectRepo}/releases` : homepage}
- Release artifact: ${artifactBaseName}.tar.gz
`
}

function createTapWorkflow () {
    return `name: Validate Tap

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  validate:
    runs-on: macos-14
    steps:
      - name: Check out tap repository
        uses: actions/checkout@v4

      - name: Verify tap layout
        run: |
          test -f Formula/secly.rb
          test -f README.md

      - name: Check formula Ruby syntax
        run: ruby -c Formula/secly.rb

      - name: Check Homebrew formula style
        env:
          HOMEBREW_NO_ANALYTICS: 1
          HOMEBREW_NO_AUTO_UPDATE: 1
        run: brew style Formula/secly.rb
`
}

const args = parseArgs(process.argv.slice(2))
const url = args.get('url')
const githubRepo = args.get('github-repo')
const releaseTag = args.get('release-tag')
const tapInput = args.get('tap')

if ((!url && !githubRepo) || !tapInput) {
    throw new Error(
        'Usage: npm run build:tap -- (--url <hosted-tarball-url> | --github-repo <owner/repo>) --tap <owner/repo> [--release-tag <tag>] [--homepage <homepage-url>].',
    )
}

const { tap } = parseTap(tapInput)
const homepage = args.get('homepage') ?? (githubRepo ? `https://github.com/${githubRepo}` : rootPackageJson.homepage ?? url)

rmSync(tapOutputRoot, { force: true, recursive: true })
mkdirSync(resolve(tapOutputRoot, 'Formula'), { recursive: true })
mkdirSync(resolve(tapOutputRoot, '.github/workflows'), { recursive: true })

const formulaArgs = [
    resolve(scriptDir, 'build-homebrew-formula.mjs'),
    '--homepage',
    homepage,
    '--output',
    tapFormulaOutputPath,
]

if (url) {
    formulaArgs.push('--url', url)
} else if (githubRepo) {
    formulaArgs.push('--github-repo', githubRepo)

    if (releaseTag) {
        formulaArgs.push('--release-tag', releaseTag)
    }
}

runCommand(process.execPath, formulaArgs)

writeFileSync(
    resolve(tapOutputRoot, 'README.md'),
    `${createTapReadme({ homepage, projectRepo: githubRepo ?? null, tap })}\n`,
    'utf8',
)

writeFileSync(
    resolve(tapOutputRoot, '.github/workflows/validate.yml'),
    `${createTapWorkflow()}\n`,
    'utf8',
)

console.log(`Homebrew tap scaffold ready at ${tapOutputRoot}`)
console.log(`Formula path: ${tapFormulaOutputPath}`)
console.log(`Tap: ${tap}`)
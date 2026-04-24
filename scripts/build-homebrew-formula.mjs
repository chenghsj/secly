#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentFile = fileURLToPath(import.meta.url)
const scriptDir = dirname(currentFile)
const repoRoot = resolve(scriptDir, '..')
const releaseRoot = resolve(repoRoot, 'dist/release')
const rootPackageJson = JSON.parse(
    readFileSync(resolve(repoRoot, 'package.json'), 'utf8'),
)

const version = rootPackageJson.version ?? '0.1.0'
const artifactBaseName = `secly-${version}-standalone`
const tarballFileName = `${artifactBaseName}.tar.gz`
const checksumPath = resolve(releaseRoot, `${artifactBaseName}.sha256`)
const formulaOutputPath = resolve(releaseRoot, 'homebrew/secly.rb')

function buildGitHubReleaseUrl ({ githubRepo, releaseTag }) {
    return `https://github.com/${githubRepo}/releases/download/${releaseTag}/${tarballFileName}`
}

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

function readSha256FromChecksumFile () {
    const checksumLine = readFileSync(checksumPath, 'utf8').trim()
    const [sha256] = checksumLine.split(/\s+/)

    if (!sha256) {
        throw new Error(`Could not parse SHA256 from ${checksumPath}.`)
    }

    return sha256
}

const args = parseArgs(process.argv.slice(2))
const githubRepo = args.get('github-repo')
const releaseTag = args.get('release-tag') ?? `v${version}`
const url = args.get('url') ?? (githubRepo ? buildGitHubReleaseUrl({ githubRepo, releaseTag }) : null)

if (!url) {
    throw new Error(
        'Usage: npm run build:formula -- (--url <hosted-tarball-url> | --github-repo <owner/repo>) [--release-tag <tag>] [--homepage <homepage-url>] [--sha256 <sha256>] [--output <path>].',
    )
}

const homepage = args.get('homepage') ?? (githubRepo ? `https://github.com/${githubRepo}` : url)
const sha256 = args.get('sha256') ?? readSha256FromChecksumFile()
const outputPath = args.get('output')
    ? resolve(repoRoot, args.get('output'))
    : formulaOutputPath

const formula = [
    'class Secly < Formula',
    '  desc "Standalone local UI for managing GitHub repository variables"',
    `  homepage "${homepage}"`,
    `  url "${url}"`,
    `  version "${version}"`,
    `  sha256 "${sha256}"`,
    '',
    '  depends_on "gh"',
    '  depends_on "node"',
    '',
    '  def install',
    '    libexec.install Dir["*"]',
    '    (bin/"secly").write <<~EOS',
    '      #!/bin/bash',
    '      exec "#{Formula["node"].opt_bin}/node" "#{libexec}/bin/secly.mjs" "$@"',
    '    EOS',
    '    chmod 0755, bin/"secly"',
    '  end',
    '',
    '  test do',
    '    output = shell_output("#{bin}/secly paths")',
    '    assert_match "App data root:", output',
    '  end',
    'end',
].join('\n')

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${formula}\n`, 'utf8')

console.log(`Homebrew formula written to ${outputPath}`)
console.log(`Tarball: ${tarballFileName}`)
console.log(`SHA256: ${sha256}`)
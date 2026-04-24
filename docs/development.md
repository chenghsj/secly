# Development Guide

This file collects the repo-internal workflow for Secly. For end-user install and daily usage, see [../README.md](../README.md).

## Working From Source

Secly's current foundation is `gh-first`: authentication is delegated to the locally installed GitHub CLI instead of an app-managed callback flow.

Prerequisites:

- macOS
- Node.js 20+
- npm
- GitHub CLI (`gh`)

Common commands:

```bash
npm install
npm run ui
npm run dev
npm run cli -- --help
```

Notes:

- `npm run ui` serves the built production UI through the CLI.
- `npm run dev` runs the Vite development server with HMR.
- `npm install` runs Secly's local install flow automatically.
- `npm run setup-local` creates a local shim when you want `secly ...` from the repo checkout.

## Project Structure

```text
secly/
├── bin/                     # CLI launcher shim target
├── drizzle/                 # Generated migrations
├── scripts/                 # Packaging and local setup helpers
├── src/
│   ├── cli/                 # CLI command surface
│   ├── components/app/      # Product shell, theme, locale UI
│   ├── components/ui/       # Shared UI components
│   ├── lib/                 # Product constants and shared helpers
│   ├── messages/            # en / zh-CN / zh-TW dictionaries
│   ├── routes/              # TanStack Start file routes
│   └── server/              # Local path, gh auth, and data-layer scaffolding
├── .github/workflows/       # Release automation
├── dist/                    # Build and release artifacts
├── package.json
└── README.md
```

## Auth Model

Secly currently does not run its own OAuth callback flow.

Instead:

1. The web UI reads local GitHub CLI auth state with `gh auth status --json hosts`.
2. If no usable session exists, `/connect` opens Terminal and runs the local Secly CLI.
3. `secly login` delegates to GitHub CLI with:

```bash
gh auth login --hostname github.com --web --git-protocol https --skip-ssh-key --scopes workflow
```

4. After the browser flow completes, Secly reuses that local `gh` session.

## Architecture Flow

1. The CLI launches the local production UI and ensures Secly's runtime directories exist under `~/Library/Application Support/secly`.
2. The web UI talks to the local TanStack Start server for auth status, repository discovery, and variable or secret operations.
3. The local server reuses the machine's `gh` session and GitHub API access instead of storing an app-managed OAuth token.
4. Runtime state such as install metadata, cache, logs, and future database content stays local to the machine.

## Packaging And Release

### Standalone package

Build the standalone package with:

```bash
npm run build:standalone
```

This writes a runnable package to `dist/package/` containing:

- `bin/secly.mjs`
- bundled CLI runtime under `src/cli/`
- built product UI under `dist/client` and `dist/server`
- a minimal `package.json`

### Release artifacts

Build the release tarball and checksum with:

```bash
npm run build:release
```

This writes assets under `dist/release/`, including:

- `secly-<version>-standalone.tar.gz`
- `secly-<version>-standalone.sha256`

### Homebrew formula generation

Generate a formula file against a hosted artifact with:

```bash
npm run build:formula -- \
  --url https://example.com/downloads/secly-<version>-standalone.tar.gz \
  --homepage https://example.com/secly
```

Or use GitHub Releases metadata:

```bash
npm run build:formula -- \
  --github-repo yourname/secly \
  --release-tag v<version>
```

By default this writes `dist/release/homebrew/secly.rb`.

### Homebrew tap scaffold

Generate a tap-shaped output with:

```bash
npm run build:tap -- \
  --github-repo yourname/secly \
  --release-tag v<version> \
  --tap yourname/homebrew-secly \
  --homepage https://github.com/yourname/secly
```

This writes `dist/release/homebrew-tap/` with:

- `Formula/secly.rb`
- `README.md`

The `--tap` value is the GitHub repository identifier. Homebrew users tap the generated repository as `yourname/secly`.

### Local Homebrew validation

Run the end-to-end Homebrew smoke test with:

```bash
npm run test:homebrew
```

That flow:

- builds the standalone release tarball
- generates `dist/release/homebrew/secly.rb` with a local `file://` tarball URL
- copies that formula into a temporary local tap
- runs `brew install --formula --ignore-dependencies`
- runs the installed `secly paths` binary as a smoke test
- uninstalls the temporary local formula again
- removes the temporary tap files again

### Automated release workflow

`.github/workflows/release.yml` runs on `v*` tags and can:

- run tests and the Homebrew smoke test
- publish GitHub release assets
- build and validate the Homebrew tap scaffold
- publish the tap repository when release credentials are configured

Optional workflow configuration:

- Repository variable: `HOMEBREW_TAP_REPOSITORY`
- Repository secret: `HOMEBREW_TAP_PUSH_TOKEN`

### Release checklist

1. Update `package.json` to the next version.
2. Run `npm run test` and `npm run build`.
3. Run `npm run build:standalone` and `npm run build:release`.
4. Regenerate release-facing Homebrew outputs with `npm run build:formula` and `npm run build:tap`.
5. Run `npm run test:homebrew` before tagging if the release changes packaging, launch, or install behavior.
6. Create and push the `v<version>` tag so `.github/workflows/release.yml` publishes the release assets and tap update.
7. Verify the GitHub Release contains the tarball and checksum, then verify the tap repository points at the same version and SHA256.

### Homebrew and CI gotchas

- The Homebrew smoke test uses `brew install --formula --ignore-dependencies`, so the formula launcher cannot assume a Homebrew-managed Node path exists on disk.
- Keep the formula wrapper on `/usr/bin/env node` so both local installs and GitHub Actions resolve Node from `PATH`.
- Treat local and CI Homebrew environments as different; keep the release workflow smoke test even if `npm run test:homebrew` passes locally.
- If you rebuild the standalone tarball, regenerate the checksum and formula together so the release asset, SHA256, and tap stay aligned.

## Local Data And Install Boundary

### Runtime data root

```text
~/Library/Application Support/secly
```

This root is reserved for Secly runtime state.

Current or planned contents:

- SQLite database
- install metadata
- cache and logs
- future app-specific repository metadata

### CLI shim path

```text
~/.local/bin/secly
```

Secly may create this symlink during setup. It does not rewrite shell startup files.

### Repository boundary

The repository working tree is treated as source code only.

That means uninstall will not:

- delete the repository folder
- remove unrelated files under your home directory
- rewrite shell profiles
- delete package-manager state that Secly did not create

## Database Scaffolding

The repository already includes Drizzle scaffolding for future persistence work.

Relevant files:

- `src/server/db/schema.ts`
- `drizzle.config.ts`
- `drizzle/`

Available scripts:

```bash
npm run db:generate
npm run db:studio
```

## Quality Checks

```bash
npm run check
npm run lint
npm run test
npm run build
```

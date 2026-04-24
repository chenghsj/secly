# Secly

Secly is a standalone desktop-local project for managing GitHub repository variables from both a web UI and a paired local CLI.

Migration notes:

- Product brand: `Secly`
- CLI command: `secly`
- Local app-data root: `~/Library/Application Support/secly`
- Local preference keys: `secly:theme`, `secly:locale`
- Existing `ghdeck` links, `~/Library/Application Support/gh-vardeck`, and legacy preference keys are migrated to the new names automatically.

The current build is `gh-first`: authentication is delegated to the locally installed GitHub CLI instead of an app-managed callback flow. The web UI reads local `gh auth status`, and the login handoff opens Terminal to run the local CLI command.

## Current Scope

### Implemented now

- Standalone TanStack Start + Vite application with branded product routes.
- Light and dark theme switching.
- Built-in locales: `en`, `zh-CN`, `zh-TW`.
- Lifecycle CLI commands:
  - `secly install`
  - `secly uninstall`
    `npm install` now also runs the local `secly install` flow automatically, so it prepares the deterministic app-data directories and creates the `~/.local/bin/secly` shim for you.

### 2. Start the web UI

```bash
secly ui
```

By default Secly starts the local UI on port `43127` and opens the browser automatically.
If that port is already occupied, the command fails immediately instead of incrementing to another port.

If you prefer not to use the shim, you can still run:

````bash
  - `secly paths`
  - `secly login`
- Deterministic local app-data boundary under `~/Library/Application Support/secly`.
This command serves the built production UI, not the Vite dev server. If `dist/` is missing or older than the source tree, it automatically runs `npm run build` first.

What `npm install` prepares automatically:
- SQLite and Drizzle scaffolding for future persistence.
- Local GitHub CLI auth integration:
  - reads `gh auth status --json hosts`
  - starts `gh auth login --web` through the local CLI
  - reuses the existing `gh` session instead of storing an app-owned OAuth token
- Creates `~/.local/bin/secly` when that path is available for the managed shim
- Repository discovery through local `gh api`
If `~/.local/bin` is not on your `PATH`, the shim still gets created, but you must invoke it by full path or add that directory to your shell configuration yourself.

### 3. Optional: rerun local install manually
### Planned next

- CLI parity for repository secrets and environment-scoped settings.
- Organization-level settings support.
- Local persistence for app-specific metadata once repository workflows exist.
Use this if you want to rerun the local install flow manually after moving the repository or replacing the shim.
### Explicitly out of scope for the current slice

## Project Structure

```text
secly/
├── bin/                     # CLI launcher shim target
├── drizzle/                 # Generated migrations live here
├── scripts/                 # Local setup and teardown helpers
├── src/
│   ├── cli/                 # CLI command surface
│   ├── components/app/      # Product shell, theme, locale UI
│   ├── components/ui/       # shadcn source components
│   ├── lib/                 # Product constants and shared helpers
│   ├── messages/            # en / zh-CN / zh-TW dictionaries
│   ├── routes/              # TanStack Start file routes
│   └── server/              # Local path, gh auth, and data-layer scaffolding
├── .env.example             # Placeholder only; auth env is not required currently
├── drizzle.config.ts
├── package.json
└── README.md
````

## Prerequisites

- macOS
- Node.js 20+
- npm
- GitHub CLI (`gh`)

Install GitHub CLI from <https://cli.github.com> if it is not already available on your machine.

## First-Time Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the web UI

```bash
npm run ui
```

On first launch Secly now creates its local runtime state automatically:

- Creates `~/Library/Application Support/secly`
- Creates `data`, `cache`, and `logs` directories inside that root
- Creates the placeholder SQLite file path for future Drizzle use
- Writes install metadata so uninstall can identify what it created

This command serves the built production UI, not the Vite dev server. If `dist/` is missing or older than the source tree, it automatically runs `npm run build` first.

### 3. Optional: create the local CLI shim

```bash
npm run setup-local
```

Use this only if you want to launch Secly through `secly ...` instead of `npm run ui` / `npm run cli -- ...`.

What this adds on top of first launch:

- Optionally links `~/.local/bin/secly` to the repo launcher

If `~/.local/bin` is not on your `PATH`, the shim still gets created, but you must invoke it by full path or add that directory to your shell configuration yourself.

After this step you can also use:

```bash
secly ui
```

By default Secly starts the local UI on port `43127` and opens the browser automatically.
If that port is already occupied, the command fails immediately instead of incrementing to another port.

Useful options:

```bash
secly ui --no-open
secly ui --port 44000
secly ui --rebuild
secly ui --host 0.0.0.0 --no-open
```

If you want to keep using npm instead of the CLI shim:

```bash
npm run ui
```

For active development with Vite HMR, keep using:

```bash
npm run dev
```

## Standalone Packaging

If you want a distributable artifact that does not depend on `tsx` or the repo `src/` tree at runtime, build the standalone package:

```bash
npm run build:standalone
```

This writes a minimal runnable package to `dist/package/` containing:

- `bin/secly.mjs`
- bundled CLI runtime under `src/cli/`
- built product UI under `dist/client` and `dist/server`
- a minimal `package.json`

That output is the right starting point for future `brew install` or global package distribution work. The current repository-root flow still works unchanged for local development.

To produce a release tarball plus SHA256 checksum from that standalone package, run:

```bash
npm run build:release
```

This writes release assets under `dist/release/`, including:

- `secly-0.1.0-standalone.tar.gz`
- `secly-0.1.0-standalone.sha256`

Those files are the intended handoff point for hosted downloads and a future Homebrew formula.

Once the tarball is hosted somewhere reachable, you can generate a formula file with:

```bash
npm run build:formula -- \
  --url https://example.com/downloads/secly-0.1.0-standalone.tar.gz \
  --homepage https://example.com/secly
```

By default this writes `dist/release/homebrew/secly.rb` using the SHA256 from the matching `.sha256` file.

If the release artifact will be published on GitHub Releases, you can skip the full URL and let Secly build it for you:

```bash
npm run build:formula -- \
  --github-repo yourname/secly \
  --release-tag v0.1.0
```

That resolves to:

- `https://github.com/yourname/secly/releases/download/v0.1.0/secly-0.1.0-standalone.tar.gz`

If you want a tap-shaped output that is ready to copy into a dedicated Homebrew tap repository, run:

```bash
npm run build:tap -- \
  --github-repo yourname/secly \
  --release-tag v0.1.0 \
  --tap yourname/homebrew-secly \
  --homepage https://github.com/yourname/secly
```

That writes a tap scaffold under `dist/release/homebrew-tap/` with:

- `Formula/secly.rb`
- `README.md`

The intended next step is to copy that directory into your tap repo, commit it there, and then users can install with:

```bash
brew tap yourname/homebrew-secly
brew install secly
```

For a local end-to-end Homebrew validation before you upload anything, run:

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

It aborts early if `secly` is already installed through Homebrew, so it does not overwrite an existing install.

### 4. Authenticate with GitHub

Use either of these entrypoints:

- Web UI: use the opened Secly UI, then go to `/connect`
- CLI: run `secly login` or `npm run cli -- login`

No app credentials or `.env.local` setup are required for the current auth flow.

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

This keeps the product local-first and avoids storing an app-managed GitHub token in this foundation slice.

## Web UI

The current web UI provides these routes:

- `/`
  - product overview
  - command surface preview
  - lifecycle boundary summary
- `/about`
  - architecture summary
  - current implementation areas
  - next delivery steps
- `/connect`
  - reads local `gh` auth status
  - reports whether GitHub CLI is installed and authenticated
  - opens Terminal to start the local login handoff when needed
- `/variables`
  - lists repositories the current local `gh` account can manage variables for
  - lists and edits repository-level Actions variables and secrets
  - creates and deletes repository environments
  - lists and edits environment-level Actions variables and secrets

### Theme behavior

- Theme modes: `Auto`, `Light`, `Dark`
- Stored under `secly:theme`.
- Legacy `gh-vardeck:theme` values are migrated automatically.

### Locale behavior

- Supported locales: `en`, `zh-CN`, `zh-TW`
- Stored under `secly:locale`.
- Legacy `gh-vardeck:locale` values are migrated automatically.

## CLI

Run the CLI through npm:

```bash
npm run cli -- --help
```

Or directly after local setup if `~/.local/bin` is on your `PATH`:

```bash
secly --help
```

### Implemented commands

```bash
secly ui
secly install
secly uninstall
secly status
secly paths
secly login
secly repos list
secly vars list owner/repo
secly vars set owner/repo NAME VALUE
secly vars delete owner/repo NAME
```

#### `secly ui`

- Serves the built TanStack Start production UI on port `43127` by default.
- Fails immediately if the requested port is already in use.
- Automatically runs `npm run build` when `dist/` is missing or stale.
- Opens the browser automatically unless `--no-open` is passed.

#### `secly install`

- Creates deterministic local directories.
- Creates the placeholder SQLite file if missing.
- Writes lifecycle metadata.
- Creates the CLI shim unless `--no-link` is passed.

Useful options:

```bash
secly install --force
secly install --no-link
```

#### `secly uninstall`

- Removes the CLI shim only if it points at this repository launcher.
- Removes the dedicated app-data root.
- Never deletes the repository working tree.

Useful options:

```bash
secly uninstall --dry-run
secly uninstall --force
```

#### `secly status`

Prints:

- app-data root presence
- SQLite placeholder presence
- CLI shim presence
- install metadata presence
- local GitHub CLI auth status

#### `secly paths`

Prints the deterministic local paths used by Secly.

#### `secly login`

Behavior:

- prints the current local GitHub CLI auth status
- exits early if GitHub CLI is already authenticated
- otherwise runs the GitHub CLI web login flow interactively in the current terminal
- refreshes and prints status again after the login flow completes

Useful option:

```bash
secly login --check
```

This prints status only and returns a non-zero exit code when no usable local `gh` session exists.

#### `secly repos list`

- Lists repositories where the current local `gh` account can manage repository variables.

#### `secly vars list <owner/repo>`

- Lists repository-level Actions variables for the selected repository.

#### `secly vars set <owner/repo> <name> <value>`

- Creates the variable when it does not exist.
- Updates the variable when it already exists.

#### `secly vars delete <owner/repo> <name>`

- Deletes a repository-level Actions variable.

### Reserved command surface

These commands are still planned and not wired yet:

```bash
secly envs list owner/repo
secly envs create owner/repo ENV_NAME
secly envs delete owner/repo ENV_NAME
secly env-vars list owner/repo ENV_NAME
secly env-vars set owner/repo ENV_NAME NAME VALUE
secly env-vars delete owner/repo ENV_NAME NAME
```

## Local Data and Install Boundary

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

These are still foundation scripts. Repository discovery and variable workflows are the next step before app-specific persistence becomes meaningful.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

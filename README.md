# GH VarDeck

GH VarDeck is a standalone desktop-local project for managing GitHub repository variables from both a web UI and a paired local CLI.

The current build is `gh-first`: authentication is delegated to the locally installed GitHub CLI instead of an app-managed callback flow. The web UI reads local `gh auth status`, and the login handoff opens Terminal to run the local CLI command.

## Current Scope

### Implemented now

- Standalone TanStack Start + Vite application with branded product routes.
- Light and dark theme switching.
- Built-in locales: `en`, `zh-CN`, `zh-TW`.
- Lifecycle CLI commands:
  - `ghdeck install`
  - `ghdeck uninstall`
  - `ghdeck status`
  - `ghdeck paths`
  - `ghdeck login`
- Deterministic local app-data boundary under `~/Library/Application Support/gh-vardeck`.
- Optional CLI shim at `~/.local/bin/ghdeck`.
- SQLite and Drizzle scaffolding for future persistence.
- Local GitHub CLI auth integration:
  - reads `gh auth status --json hosts`
  - starts `gh auth login --web` through the local CLI
  - reuses the existing `gh` session instead of storing an app-owned OAuth token
- Repository discovery through local `gh api`
- Repository Actions variable CRUD from both the web UI and CLI

### Planned next

- Environment list/create/delete.
- Environment-variable CRUD.
- Local persistence for app-specific metadata once repository workflows exist.

### Explicitly out of scope for the current slice

- GitHub secrets management.
- Organization-level variables.
- Environment protection rule editing.
- Required reviewers, wait timers, and branch policy editing.
- Native packaged installers.

## Stack

- TanStack Start
- Vite
- TanStack Router
- shadcn/ui with Tailwind CSS v4
- Commander for the CLI
- SQLite with Drizzle scaffolding
- TypeScript throughout

## Project Structure

```text
gh-vardeck/
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
```

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

### 2. Create local runtime state and the optional CLI shim

```bash
npm run setup-local
```

What this does now:

- Creates `~/Library/Application Support/gh-vardeck`
- Creates `data`, `cache`, and `logs` directories inside that root
- Creates the placeholder SQLite file path for future Drizzle use
- Writes install metadata so uninstall can identify what it created
- Optionally links `~/.local/bin/ghdeck` to the repo launcher

If `~/.local/bin` is not on your `PATH`, the shim still gets created, but you must invoke it by full path or add that directory to your shell configuration yourself.

### 3. Start the web UI

```bash
ghdeck ui
```

By default GH VarDeck starts the local UI, chooses the first free port starting at `3000`, and opens the browser automatically.

This command serves the built production UI, not the Vite dev server. If `dist/` is missing or older than the source tree, it automatically runs `npm run build` first.

Useful options:

```bash
ghdeck ui --no-open
ghdeck ui --port 3001
ghdeck ui --rebuild
ghdeck ui --host 0.0.0.0 --no-open
```

If you want to run it through npm instead of the CLI shim:

```bash
npm run ui
```

For active development with Vite HMR, keep using:

```bash
npm run dev
```

### 4. Authenticate with GitHub

Use either of these entrypoints:

- Web UI: use the opened GH VarDeck UI, then go to `/connect`
- CLI: run `ghdeck login` or `npm run cli -- login`

No app credentials or `.env.local` setup are required for the current auth flow.

## Auth Model

GH VarDeck currently does not run its own OAuth callback flow.

Instead:

1. The web UI reads local GitHub CLI auth state with `gh auth status --json hosts`.
2. If no usable session exists, `/connect` opens Terminal and runs the local GH VarDeck CLI.
3. `ghdeck login` delegates to GitHub CLI with:

```bash
gh auth login --hostname github.com --web --git-protocol https --skip-ssh-key --scopes workflow
```

4. After the browser flow completes, GH VarDeck reuses that local `gh` session.

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
  - lists repository-level Actions variables
  - creates, updates, and deletes repository-level Actions variables

### Theme behavior

- Theme modes: `Auto`, `Light`, `Dark`
- Stored under `gh-vardeck:theme`

### Locale behavior

- Supported locales: `en`, `zh-CN`, `zh-TW`
- Stored under `gh-vardeck:locale`

## CLI

Run the CLI through npm:

```bash
npm run cli -- --help
```

Or directly after local setup if `~/.local/bin` is on your `PATH`:

```bash
ghdeck --help
```

### Implemented commands

```bash
ghdeck ui
ghdeck install
ghdeck uninstall
ghdeck status
ghdeck paths
ghdeck login
ghdeck repos list
ghdeck vars list owner/repo
ghdeck vars set owner/repo NAME VALUE
ghdeck vars delete owner/repo NAME
```

#### `ghdeck ui`

- Serves the built TanStack Start production UI with the first free port starting at `3000`.
- Automatically runs `npm run build` when `dist/` is missing or stale.
- Opens the browser automatically unless `--no-open` is passed.

#### `ghdeck install`

- Creates deterministic local directories.
- Creates the placeholder SQLite file if missing.
- Writes lifecycle metadata.
- Creates the CLI shim unless `--no-link` is passed.

Useful options:

```bash
ghdeck install --force
ghdeck install --no-link
```

#### `ghdeck uninstall`

- Removes the CLI shim only if it points at this repository launcher.
- Removes the dedicated app-data root.
- Never deletes the repository working tree.

Useful options:

```bash
ghdeck uninstall --dry-run
ghdeck uninstall --force
```

#### `ghdeck status`

Prints:

- app-data root presence
- SQLite placeholder presence
- CLI shim presence
- install metadata presence
- local GitHub CLI auth status

#### `ghdeck paths`

Prints the deterministic local paths used by GH VarDeck.

#### `ghdeck login`

Behavior:

- prints the current local GitHub CLI auth status
- exits early if GitHub CLI is already authenticated
- otherwise runs the GitHub CLI web login flow interactively in the current terminal
- refreshes and prints status again after the login flow completes

Useful option:

```bash
ghdeck login --check
```

This prints status only and returns a non-zero exit code when no usable local `gh` session exists.

#### `ghdeck repos list`

- Lists repositories where the current local `gh` account can manage repository variables.

#### `ghdeck vars list <owner/repo>`

- Lists repository-level Actions variables for the selected repository.

#### `ghdeck vars set <owner/repo> <name> <value>`

- Creates the variable when it does not exist.
- Updates the variable when it already exists.

#### `ghdeck vars delete <owner/repo> <name>`

- Deletes a repository-level Actions variable.

### Reserved command surface

These commands are still planned and not wired yet:

```bash
ghdeck envs list owner/repo
ghdeck envs create owner/repo ENV_NAME
ghdeck envs delete owner/repo ENV_NAME
ghdeck env-vars list owner/repo ENV_NAME
ghdeck env-vars set owner/repo ENV_NAME NAME VALUE
ghdeck env-vars delete owner/repo ENV_NAME NAME
```

## Local Data and Install Boundary

### Runtime data root

```text
~/Library/Application Support/gh-vardeck
```

This root is reserved for GH VarDeck runtime state.

Current or planned contents:

- SQLite database
- install metadata
- cache and logs
- future app-specific repository metadata

### CLI shim path

```text
~/.local/bin/ghdeck
```

GH VarDeck may create this symlink during setup. It does not rewrite shell startup files.

### Repository boundary

The repository working tree is treated as source code only.

That means uninstall will not:

- delete the repository folder
- remove unrelated files under your home directory
- rewrite shell profiles
- delete package-manager state that GH VarDeck did not create

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

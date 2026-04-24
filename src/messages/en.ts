export const enMessages = {
  common: {
    foundationStatus: 'Foundation build',
    availableLabel: 'Available now',
    plannedLabel: 'Planned next',
    currentSliceLabel: 'Current slice',
    configuredLabel: 'Configured',
    missingLabel: 'Missing config',
    notPersistedLabel: 'Not persisted yet',
    appDataRootLabel: 'App data root',
    cliLinkLabel: 'CLI shim',
    repositoryBoundaryLabel: 'Repository boundary',
  },
  nav: {
    home: 'Home',
    variables: 'Variables',
    account: 'Account',
    connect: 'Connect GitHub',
    githubAppDocs: 'GitHub CLI docs',
    tanstackDocs: 'TanStack docs',
  },
  accountMenu: {
    triggerLabel: 'Account menu',
    signedInAs: 'Signed in as',
    switchAccount: 'Switch account',
    openOnGitHub: 'Open on GitHub',
    openProfile: 'Your profile',
    openRepositories: 'Your repositories',
    openOrganizations: 'Your organizations',
    manageAccounts: 'Manage accounts',
    refreshStatus: 'Refresh status',
    githubCliDocs: 'GitHub CLI docs',
    signOut: 'Sign out',
    signIn: 'Sign in with GitHub CLI',
    noActiveAccount: 'No active GitHub account',
    activeBadge: 'Active',
    switchSuccess: 'Active GitHub account switched.',
    switchFailed: 'Secly could not switch the active GitHub CLI account.',
    refreshFailed: 'Secly could not refresh the local GitHub CLI status.',
  },
  theme: {
    label: 'Theme',
    light: 'Light',
    dark: 'Dark',
  },
  locale: {
    label: 'Language',
    en: 'English',
    zhCN: 'Simplified Chinese',
    zhTW: 'Traditional Chinese',
  },
  home: {
    heroKicker: 'Local-first GitHub variable manager',
    heroTitle: 'Manage repository variables from a dedicated web UI and CLI.',
    heroDescription:
      'Secly is being built as a standalone TanStack Start + Vite application with predictable local storage, clean uninstall boundaries, and local GitHub CLI authentication.',
    heroPrimary: 'Check GitHub login',
    heroSecondary: 'Review architecture',
    foundationAlertTitle: 'Foundation slice in progress',
    foundationAlertDescription:
      'This build establishes the TanStack Start shell, shadcn primitives, theme and locale switching, local lifecycle scripts, GitHub CLI login reuse, and the initial CLI surface. Repository discovery and variable CRUD land next.',
    tabs: {
      overview: 'Overview',
      commands: 'Commands',
      lifecycle: 'Lifecycle',
    },
    cards: {
      milestoneOneTitle: 'Milestone 1',
      milestoneOneDescription: 'Repository-level Actions variable CRUD.',
      milestoneTwoTitle: 'Milestone 2',
      milestoneTwoDescription:
        'Environment list/create/delete plus environment-variable CRUD.',
      installTitle: 'Lifecycle boundary',
      installDescription:
        'Single app data root, tracked CLI shim, clean uninstall path.',
      stackTitle: 'Technical baseline',
      stackDescription:
        'TanStack Start + Vite, shadcn/ui, Commander, SQLite, and Drizzle.',
    },
    architectureTitle: 'What is already locked in',
    architectureDescription:
      'The first implementation slice focuses on stable boundaries before GitHub integration begins.',
    architecturePoints: [
      {
        title: 'Standalone desktop repo',
        description:
          'Built outside netflix-danmaku so product iteration does not bleed into the existing workspace.',
      },
      {
        title: 'TanStack Start + Vite shell',
        description:
          'Fast local iteration, typed file routes, and a single web runtime foundation.',
      },
      {
        title: 'Local CLI skeleton',
        description:
          'The CLI already reserves install, uninstall, status, and deterministic path inspection commands.',
      },
      {
        title: 'Predictable local state',
        description:
          'Runtime state lives outside the repo so uninstall can be precise and safe.',
      },
    ],
    currentPathsTitle: 'Tracked local paths',
    currentPathsDescription:
      'The current slice uses deterministic macOS paths so setup and teardown remain auditable.',
    repositoryBoundaryValue:
      'Clone path stays source-only and is deleted manually.',
    pathDetails: {
      appData:
        'SQLite, CLI metadata, encrypted token storage, and install state will live here.',
      cliShim:
        'Optional symlink created by the local setup flow so the command can be launched directly.',
      repository:
        'The working tree is not treated as disposable runtime data and is never removed by uninstall.',
    },
    commandsTitle: 'CLI surface mapped before GitHub auth',
    commandsDescription:
      'Install and uninstall commands are implemented first. Repo and environment operations are already reserved so the command grammar stays stable as capabilities are added.',
    commandTable: {
      command: 'Command',
      status: 'Status',
      description: 'Current role',
    },
    commandDescriptions: {
      ui: 'Serve the local production web UI, rebuilding it first when needed, and open it in the default browser.',
      install: 'Create the local app data root and optional CLI shim.',
      uninstall:
        'Remove the CLI shim and local app data root without touching the repository working tree.',
      status: 'Inspect install state, tracked paths, and lifecycle metadata.',
      paths: 'Print deterministic local paths used by the product.',
      login: 'Inspect or start the local GitHub CLI web login flow.',
      reposList:
        'List repositories where the current gh account can manage Actions variables.',
      vars: 'List, create, update, and delete repository-level Actions variables.',
      envs: 'Planned environment create and delete operations.',
      envVars: 'Planned environment-variable CRUD.',
    },
    commandsFooter:
      'The shipped CLI already supports lifecycle operations; GitHub-facing commands are intentionally marked as planned.',
    lifecycleTitle: 'Clean install and uninstall boundary',
    lifecycleDescription:
      'The lifecycle model treats local runtime state and source code as separate concerns so removal is predictable.',
    lifecycleAlertTitle: 'What uninstall is allowed to remove',
    lifecycleAlertDescription:
      'Only the tracked app data root and the CLI shim created by Secly. Shell profiles, unrelated files, and the repo itself are left alone.',
    installTitle: 'Install behavior',
    installDescription:
      'Setup creates the deterministic local directories and links the command shim without modifying shell startup files.',
    installSteps: [
      'Create ~/Library/Application Support/secly with data, cache, and logs directories.',
      'Write install metadata so status and uninstall know exactly what was created.',
      'Optionally link ~/.local/bin/secly to the repository launcher without touching PATH configuration.',
    ],
    uninstallTitle: 'Uninstall behavior',
    uninstallDescription:
      'Teardown removes only assets Secly created and can positively identify.',
    uninstallSteps: [
      'Remove the tracked CLI shim if it points to this repository launcher.',
      'Remove the dedicated app data root after confirmation or force mode.',
      'Leave the repository working tree intact so source files are always deleted manually.',
    ],
    lifecycleFooter:
      'Current shell scripts wrap the CLI so the same install and uninstall logic is shared between direct command usage and setup helpers.',
  },
  connect: {
    kicker: 'GitHub CLI auth',
    title: 'Reuse your local GitHub CLI login instead of running app OAuth.',
    description:
      'Secly reads gh auth status from the same machine running the app. If you are not signed in yet, this page opens Terminal and delegates login to the local Secly CLI, which then runs gh auth login --web.',
    statusTitle: 'Current GitHub CLI status',
    statusDescription:
      'This page checks the local gh session that Secly will reuse for repository discovery and variable management.',
    authenticatedTitle: 'GitHub CLI is already authenticated',
    authenticatedDescription:
      'An active gh session is available on this machine, so Secly can use it immediately.',
    unauthenticatedTitle: 'GitHub CLI is installed but not logged in',
    unauthenticatedDescription:
      'Start the local login flow, complete the browser approval, then return to this page. Secly will refresh the status automatically.',
    missingCliTitle: 'GitHub CLI is not installed',
    missingCliDescription:
      'Install gh on this machine before using Secly auth. The web UI only reuses a local GitHub CLI session.',
    authenticatedBadge: 'Authenticated',
    unauthenticatedBadge: 'Needs login',
    missingCliBadge: 'Missing gh',
    binaryLabel: 'GitHub CLI binary',
    authStateLabel: 'Auth state',
    issuesTitle: 'Auth issues',
    installUrlLabel: 'Install URL',
    missingValue: 'Not available',
    installButton: 'Install GitHub CLI',
    startButton: 'Sign in with GitHub CLI',
    startingLoginButton: 'Starting login…',
    addAnotherAccountButton: 'Add another account',
    manualWebLoginTitle: 'Approve GitHub in your browser',
    manualWebLoginDescription:
      'Copy the one-time code, finish the GitHub approval in your browser, then come back here. You can cancel this step any time before approval.',
    manualWebLoginCodeLabel: 'One-time code',
    manualWebLoginWaiting: 'Waiting for browser approval…',
    copyCodeButton: 'Copy code',
    copyCodeAndOpenBrowserButton: 'Copy code and open browser',
    openBrowserButton: 'Open verification page',
    cancelLoginButton: 'Cancel',
    cancellingLoginButton: 'Cancelling…',
    cancelLoginFailed:
      'Secly could not cancel the pending GitHub CLI login flow.',
    oneTimeCodeCopied: 'One-time code copied.',
    oneTimeCodeCopyFailed:
      'Secly could not copy the one-time code automatically.',
    authenticatedButton: 'GitHub CLI ready',
    refreshFailed: 'Secly could not refresh the local GitHub CLI status.',
    switchAccountTitle: 'Switch account',
    switchAccountDescription:
      'Choose another authenticated gh account already available on this machine.',
    switchAccountLabel: 'Available GitHub accounts',
    switchAccountPlaceholder: 'Select an account',
    switchAccountButton: 'Switch active account',
    switchingAccountButton: 'Switching account…',
    switchAccountUnavailable:
      'Add a second authenticated gh account on github.com to enable local switching.',
    switchSelectionRequired: 'Select a GitHub account before switching.',
    switchFailed: 'Secly could not switch the active GitHub CLI account.',
    switchSuccess: 'Active GitHub account switched.',
    logoutSectionTitle: 'Log out accounts',
    logoutSectionDescription:
      'Remove the current account or clear every github.com account stored locally in gh on this machine.',
    logoutAccountButton: 'Log out',
    logoutCurrentButton: 'Log out current account',
    logoutAllButton: 'Log out all accounts',
    logoutAccountDialogTitle: 'Log out this account?',
    logoutAccountDialogDescription:
      'This removes the selected github.com account from the local GitHub CLI on this machine.',
    logoutCurrentDialogTitle: 'Log out the current account?',
    logoutCurrentDialogDescription:
      'This removes the active github.com account from the local GitHub CLI on this machine.',
    logoutAllDialogTitle: 'Log out every local account?',
    logoutAllDialogDescription:
      'This removes every github.com account currently stored by the local GitHub CLI on this machine.',
    logoutCancelButton: 'Cancel',
    logoutAccountConfirmButton: 'Log out account',
    logoutCurrentConfirmButton: 'Log out current account',
    logoutAllConfirmButton: 'Log out all accounts',
    loggingOutAccountButton: 'Logging out account…',
    loggingOutCurrentButton: 'Logging out current account…',
    loggingOutAllButton: 'Logging out all accounts…',
    logoutAccountSuccess: 'GitHub account logged out.',
    logoutCurrentSuccess: 'Current GitHub account logged out.',
    logoutAllSuccess: 'All local GitHub accounts logged out.',
    logoutFailed: 'Secly could not log out the selected GitHub CLI accounts.',
    backHomeButton: 'Back home',
    docsButton: 'Open GitHub CLI docs',
    preflightTitle: 'Before you start',
    preflightDescription:
      'This flow is intentionally local-first. Secly does not store its own GitHub OAuth token for this slice.',
    preflightSteps: [
      {
        title: '1. Install GitHub CLI',
        description:
          'Install gh on the same machine that runs Secly. This page reads local gh auth state directly.',
      },
      {
        title: '2. Start login from Secly',
        description:
          'Use the button above to open Terminal and run the local Secly login command, which delegates to gh auth login --web.',
      },
      {
        title: '3. Return after approval',
        description:
          'Finish the browser flow opened by gh, then return to this page. Secly will refresh the active account automatically.',
      },
    ],
    launchingTitle: 'Starting local GitHub CLI login',
    launchingDescription:
      'Secly is opening Terminal and handing off to the local CLI so gh can start its browser-based login flow.',
    launchSuccessTitle: 'Local GitHub login started',
    errorTitle: 'GitHub CLI login did not start',
    startFailed: 'Secly could not start the local GitHub CLI login flow.',
    accountCardTitle: 'Connected GitHub accounts',
    accountCardDescription:
      'Secly uses the active local gh account for repository discovery and variables. You can switch or log out saved accounts below.',
    shellDescription: 'Reuse the local gh session on this machine.',
    currentAccountBadge: 'Active',
    commandsCardTitle: 'Local auth commands',
    commandsCardDescription:
      'These commands are the contract between the web UI and the paired local CLI.',
    githubAccountLabel: 'GitHub login',
    hostLabel: 'Host',
    tokenSourceLabel: 'Token source',
    gitProtocolLabel: 'Git protocol',
    scopesLabel: 'Scopes',
    statusCommandLabel: 'Status command',
    loginCommandLabel: 'Login command',
    notAuthenticatedTitle: 'Sign in with GitHub CLI',
    notAuthenticatedDescription:
      'Secly uses the local gh session on this machine. Start login, approve in your browser, and this page will update automatically when you come back.',
  },
  variables: {
    shellDescription:
      'Edit GitHub Actions variables, secrets, and environments.',
    sidebarSubtitle: 'Local Actions settings workspace',
    targetTitle: 'Target',
    targetDescriptionRepository: 'Choose which repository to work in.',
    targetDescriptionEnvironment:
      'Choose the repository and environment before editing environment-scoped settings.',
    unauthenticatedTitle: 'GitHub CLI login is required first',
    unauthenticatedDescription:
      'Secly reuses the local gh session on this machine. Open the Account page, complete the login flow, then return here.',
    openAccountButton: 'Open account page',
    repositoryLabel: 'Repository',
    scopeLabel: 'Scope',
    environmentLabel: 'Environment',
    environmentEmptyOptionLabel: '(no variables)',
    createEnvironmentLabel: 'Create environment',
    repositorySearchPlaceholder: 'Search repositories',
    environmentSearchPlaceholder: 'Search environments',
    selectionSearchEmpty: 'No matching options.',
    createEnvironmentDescription: 'Add a new environment for {repository}.',
    refreshButton: 'Refresh',
    clearSearchButton: 'Clear search',
    resetButton: 'Reset',
    quickEditTab: 'Single entry',
    bulkPasteTab: 'Bulk paste',
    bulkFieldLabel: 'Paste .env-style lines',
    previewTitle: 'Preview',
    variableSettingsTitle: 'Variable settings',
    secretSettingsTitle: 'Secret settings',
    editorSelectRepositoryTitle: 'Choose a repository first',
    editorSelectRepositoryDescription:
      'Select the repository you want to edit, then this editor will unlock.',
    editorSelectEnvironmentTitle: 'Choose an environment first',
    editorSelectEnvironmentDescription:
      'Create or select an environment in the target panel before editing environment-scoped settings.',
    noRepositoriesTitle: 'No manageable repositories found',
    noRepositoriesDescription:
      'Make sure the active gh account has write access to at least one repository.',
    noEnvironmentsTitle: 'No environments yet',
    noEnvironmentsDescription:
      'Create the first environment for {repository} to start managing environment-scoped settings.',
    environmentAdminAccessDescription:
      'Creating and deleting environments requires repository owner or admin access on GitHub.',
    selectRepositoryTitle: 'Choose a repository first',
    selectRepositoryDescription:
      'Select a repository before loading or changing settings.',
    selectEnvironmentTitle: 'Choose an environment first',
    selectEnvironmentDescription:
      'Select one environment before loading or changing environment-scoped settings.',
    noEntriesTitle: 'No {entries} yet',
    noEntriesDescription:
      'Create the first {entry} for {target} from the editor modal.',
    noMatchesTitle: 'No {entries} match this filter',
    noMatchesDescription:
      'Try a different keyword or clear the current search.',
    globalSearch: {
      title: 'Repository search',
      description:
        "Search across the current repository's variables, secrets, and environment-scoped entries.",
      placeholder: 'Search all scopes in this repository',
      idleTitle: 'Search across all scopes',
      idleDescription:
        'Type to search repository variables, repository secrets, environment variables, and environment secrets for the selected repository.',
      loadingTitle: 'Searching this repository',
      loadingDescription:
        'Loading variables, secrets, and environment-scoped entries for the selected repository.',
      noResultsTitle: 'No matching entries found',
      noResultsDescription:
        'Try a different keyword. Secret values are never returned by GitHub, so only names and metadata can match.',
      openResultLabel: 'Open {scope} {name}',
    },
    noteSecretTitle: 'Secret values are never returned by GitHub',
    noteSecretDescription:
      'Use this editor to create or rotate secret values. After each save, only the metadata stays visible here.',
    noteSecretEditTitle: 'Enter a replacement secret value',
    noteSecretEditDescription:
      'Saving here overwrites the current secret with the new value you provide.',
    deleteDialogCancel: 'Cancel',
    deleteDialogDeleting: 'Deleting…',
    unsavedDialogTitle: 'Discard unsaved changes?',
    unsavedDialogDescription:
      'Your current edits have not been saved yet. Leave this draft and continue?',
    unsavedDialogStay: 'Keep editing',
    unsavedDialogDiscard: 'Discard changes',
    columns: {
      name: 'Name',
      value: 'Value',
      storedAs: 'Stored as',
      updated: 'Updated',
      actions: 'Actions',
    },
    sorting: {
      sortByColumn: 'Sort by {column}',
    },
    states: {
      editing: 'Editing {name}',
      secretStored: 'Encrypted on GitHub',
      secretStoredWithVisibility: 'Encrypted on GitHub ({visibility})',
      previewReadySingular: '1 {entry} ready.',
      previewReadyPlural: '{count} {entries} ready.',
      duplicatesSingular: '1 duplicate name will use the last pasted value.',
      duplicatesPlural:
        '{count} duplicate names will use the last pasted value.',
      noDuplicates: 'No duplicate names detected.',
      moreEntries: '+{count} more',
      moreLinesSingular: '+1 more line.',
      moreLinesPlural: '+{count} more lines.',
    },
    validation: {
      unsavedChangesPrompt:
        'You have unsaved changes. Discard them and continue?',
      selectRepositoryBeforeSaving:
        'Select a repository before saving a {entry}.',
      selectRepositoryBeforeBulk:
        'Select a repository before saving bulk {entry} changes.',
      selectRepositoryBeforeCreateEnvironment:
        'Select a repository before creating an environment.',
      selectEnvironmentBeforeLoading:
        'Select an environment before loading environment-scoped settings.',
      selectEnvironmentBeforeSaving:
        'Select an environment before saving environment-scoped settings.',
      selectEnvironmentBeforeApplying:
        'Select an environment before saving environment-scoped settings.',
      selectEnvironmentBeforeDeleting:
        'Select an environment before deleting it.',
      entryNameRequired: '{entryTitle} name is required.',
      secretValueRequired: 'Secret value is required.',
      bulkInputRequired: 'Paste at least one NAME=value line before saving.',
      invalidLines: 'Fix the invalid lines below before saving.',
      environmentNameRequired: 'Environment name is required.',
      bulkExpectedNameValue: 'Line {line}: expected NAME=value.',
      bulkInvalidName: 'Line {line}: {name} is not a valid variable name.',
      bulkSecretValueRequired:
        'Line {line}: {name} requires a non-empty secret value.',
    },
    actions: {
      add: 'Add',
      edit: 'Edit',
      update: 'Update',
      delete: 'Delete',
      deleteSelected: 'Delete selected',
      done: 'Done',
      selectAll: 'Select all',
      selectEntry: 'Select {name}',
      createEntry: 'Create {entry}',
      updateEntry: 'Update {entry}',
      createFirstEntry: 'Create first {entry}',
      createBulk: 'Create {count} {entries}',
      updateBulk: 'Update {count} {entries}',
      upsertBulk: 'Create or update {count} {entries}',
      createEnvironment: 'Create environment',
      deleteEnvironment: 'Delete environment',
      saving: 'Saving…',
      applying: 'Saving…',
      creatingEnvironment: 'Creating…',
      clearPaste: 'Clear paste',
    },
    feedback: {
      created: '{entryTitle} created',
      updated: '{entryTitle} updated',
      savedInTarget: '{name} is now stored in {target}.',
      metadataAvailableInTarget:
        '{name} metadata is now available in {target}.',
      bulkComplete: 'Bulk update complete',
      bulkCompleteDescription: 'Updated {count} {entries} in {target}.',
      bulkStopped: 'Bulk update stopped',
      bulkStoppedDescription: 'Could not finish the bulk update.',
      bulkStoppedPartial:
        '{count} {entries} were saved before the process stopped. {reason}',
      entryDeleted: '{entryTitle} deleted',
      entryDeletedDescription: '{name} was removed from {target}.',
      entriesDeleted: '{count} {entries} deleted',
      entriesDeletedDescription:
        '{count} {entries} were removed from {target}.',
      environmentCreated: 'Environment created',
      environmentCreatedDescription: '{name} is now available in {repository}.',
      environmentDeleted: 'Environment deleted',
      environmentDeletedDescription: '{name} was removed from {repository}.',
    },
    errors: {
      loadFailed: 'Could not load {subject}.',
      refreshRepositoriesFailed: 'Could not refresh repositories.',
      saveFailed: 'Could not save the {entry}.',
      deleteFailed: 'Could not delete the {entry}.',
      deleteSelectedFailed: 'Could not delete the selected {entries}.',
      createEnvironmentFailed: 'Could not create the environment.',
      deleteEnvironmentFailed: 'Could not delete the environment.',
    },
    deleteDialog: {
      environmentTitle: 'Delete environment {name}?',
      environmentDescription:
        'This will permanently remove the {name} environment from {repository}. This action cannot be undone.',
      entryTitle: 'Delete {entry} {name}?',
      entryDescription:
        'This will permanently delete {name} from {target}. This action cannot be undone.',
      entriesTitle: 'Delete {count} {entries}?',
      entriesDescription:
        'This will permanently delete {count} {entries} from {target}. This action cannot be undone.',
      selectedEntriesLabel: 'Selected entries',
      confirmationLabel: 'Type {value} to confirm deletion.',
      confirmationPrefix: 'Type',
      confirmationSuffix: 'to confirm deletion.',
      copyConfirmationButton: 'Copy confirmation value',
      confirmationCopied: 'Confirmation value copied.',
      confirmationCopyFailed:
        'Secly could not copy the confirmation value automatically.',
    },
    pending: {
      targetTitle: 'Target',
      targetDescription: 'Loading repository access and the current selection.',
      listTitle: 'Settings list',
      listDescription:
        'Loading repository and environment settings for the current scope.',
      listRefreshingLabel: 'Loading the current scope settings…',
      editorTitle: 'Editor',
      editorDescription:
        'Loading the editing tools for this repository and scope.',
    },
    scopes: {
      repositoryVariables: {
        title: 'Repository variables',
        tabLabel: 'Repo vars',
        description:
          'Choose one repository, then create or update plain-text GitHub Actions variables.',
        listDescription:
          'Search existing repository variables and choose one to edit.',
        editorDescription:
          'Use Single entry for one change or Bulk paste to apply a .env-style block.',
        editingDescription:
          'Editing {name}. Save to replace the current variable value.',
        searchPlaceholder: 'Search by name or value',
        bulkPlaceholder: `API_BASE_URL=https://example.com
FEATURE_FLAG=true
export PUBLIC_APP_NAME=Secly`,
        valuePlaceholder: 'https://example.com',
        entryLabel: 'variable',
        entryTitle: 'Variable',
        entryPluralLabel: 'variables',
        loadLabel: 'repository variables',
        valueColumnLabel: 'Value',
      },
      repositorySecrets: {
        title: 'Repository secrets',
        tabLabel: 'Repo secrets',
        description:
          'Choose one repository, then create or rotate encrypted GitHub Actions secrets.',
        listDescription:
          'Search repository secret names and choose one to rotate.',
        editorDescription:
          'Use Single entry for one secret or Bulk paste to rotate multiple values from a .env-style block.',
        editingDescription:
          'Editing {name}. Paste a new secret value and save to rotate it.',
        searchPlaceholder: 'Search by name',
        bulkPlaceholder: `STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
CF_API_TOKEN=...`,
        valuePlaceholder: 'Paste a replacement secret value',
        entryLabel: 'secret',
        entryTitle: 'Secret',
        entryPluralLabel: 'secrets',
        loadLabel: 'repository secrets',
        valueColumnLabel: 'Stored as',
      },
      environmentVariables: {
        title: 'Environment variables',
        tabLabel: 'Env vars',
        description:
          'Choose one repository and environment, then manage plain-text environment variables.',
        listDescription:
          'Search existing environment variables and choose one to edit.',
        editorDescription:
          'Use Single entry for one change or Bulk paste to apply a .env-style block.',
        editingDescription:
          'Editing {name}. Save to replace the current variable value.',
        searchPlaceholder: 'Search by name or value',
        bulkPlaceholder: `API_BASE_URL=https://example.com
FEATURE_FLAG=true
PUBLIC_APP_NAME=Secly`,
        valuePlaceholder: 'https://example.com',
        entryLabel: 'variable',
        entryTitle: 'Variable',
        entryPluralLabel: 'variables',
        loadLabel: 'environment variables',
        valueColumnLabel: 'Value',
      },
      environmentSecrets: {
        title: 'Environment secrets',
        tabLabel: 'Env secrets',
        description:
          'Choose one repository and environment, then create or rotate encrypted environment secrets.',
        listDescription:
          'Search environment secret names and choose one to rotate.',
        editorDescription:
          'Use Single entry for one secret or Bulk paste to rotate multiple values from a .env-style block.',
        editingDescription:
          'Editing {name}. Paste a new secret value and save to rotate it.',
        searchPlaceholder: 'Search by name',
        bulkPlaceholder: `STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
CF_API_TOKEN=...`,
        valuePlaceholder: 'Paste a replacement secret value',
        entryLabel: 'secret',
        entryTitle: 'Secret',
        entryPluralLabel: 'secrets',
        loadLabel: 'environment secrets',
        valueColumnLabel: 'Stored as',
      },
    },
  },
} as const

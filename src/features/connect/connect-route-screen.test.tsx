// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLI_LOGIN_COMMAND } from '#/lib/product'
import { translations } from '#/messages'
import { ConnectRouteScreen } from './connect-route-screen'
import { createConnectRouteScreenModel } from './connect-route-screen-model'

vi.mock('#/components/app/connect-guest-card-controls', () => ({
  ConnectGuestCardControls: () => <div>guest-controls</div>,
}))

type ConnectControllerState = Parameters<
  typeof createConnectRouteScreenModel
>[0]['controller']

const connectMessages = translations.en.connect

afterEach(() => {
  cleanup()
})

function createStatus({
  authenticated = false,
  ghInstalled = true,
}: {
  authenticated?: boolean
  ghInstalled?: boolean
} = {}) {
  return {
    activeAccount: authenticated
      ? {
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'cheng',
          scopes: ['repo'],
          state: 'success',
          tokenSource: 'keyring',
        }
      : null,
    authenticated,
    cliLoginCommand: CLI_LOGIN_COMMAND,
    ghInstalled,
    ghLoginCommand: 'gh auth login --web',
    installUrl: 'https://cli.github.com',
    issues: [],
    knownAccounts: [],
    statusCommand: 'gh auth status --json hosts',
  }
}

function createGithubAccount({
  active = false,
  login,
}: {
  active?: boolean
  login: string
}) {
  return {
    active,
    gitProtocol: 'https',
    host: 'github.com',
    login,
    scopes: ['repo'],
    state: 'success' as const,
    tokenSource: 'keyring' as const,
  }
}

function createController(
  overrides: Partial<ConnectControllerState> = {},
): ConnectControllerState {
  return {
    activeGithubAccount: null,
    errorMessage: null,
    githubAccounts: [],
    handleCancelLogin: vi.fn().mockResolvedValue(undefined),
    handleConfirmLogout: vi.fn().mockResolvedValue(undefined),
    handleCopyCode: vi.fn(),
    handleOpenBrowser: vi.fn(),
    handleStartLogin: vi.fn().mockResolvedValue(undefined),
    handleSwitchAccount: vi.fn().mockResolvedValue(undefined),
    hasMultipleGithubAccounts: false,
    hasReturnedFromBrowser: false,
    isAuthenticated: false,
    isBusy: false,
    isCancellingLogin: false,
    isLaunching: false,
    isLoggingOut: false,
    loginActionLabel: connectMessages.startButton,
    manualWebLaunch: null,
    pendingLogoutAction: null,
    pendingLogoutLogin: null,
    phase: 'idle',
    setPendingLogoutAction: vi.fn(),
    status: createStatus(),
    switchingAccountLogin: null,
    ...overrides,
  }
}

function renderScreen(overrides: Partial<ConnectControllerState> = {}) {
  const controller = createController(overrides)
  const model = createConnectRouteScreenModel({
    connectMessages,
    controller,
  })

  return {
    controller,
    model,
    ...render(<ConnectRouteScreen model={model} />),
  }
}

describe('ConnectRouteScreen', () => {
  it('renders the initial login branch for unauthenticated users', () => {
    renderScreen()

    expect(
      screen.getByText(connectMessages.notAuthenticatedDescription),
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: connectMessages.startButton }),
    ).toBeDefined()
    expect(screen.getByText('guest-controls')).toBeDefined()
  })

  it('renders the manual web login branch and waiting state', () => {
    renderScreen({
      hasReturnedFromBrowser: true,
      manualWebLaunch: {
        verificationCode: 'ABCD-EFGH',
        verificationUrl: 'https://github.com/login/device',
      },
      phase: 'launched',
    })

    expect(screen.getByText(connectMessages.manualWebLoginTitle)).toBeDefined()
    expect(screen.getByText('ABCD-EFGH')).toBeDefined()
    expect(
      screen.getByText(connectMessages.manualWebLoginWaiting),
    ).toBeDefined()
  })

  it('renders the authenticated account branch with switch and logout actions', () => {
    renderScreen({
      activeGithubAccount: {
        active: true,
        gitProtocol: 'https',
        host: 'github.com',
        login: 'alpha',
        scopes: ['repo'],
        state: 'success',
        tokenSource: 'keyring',
      },
      githubAccounts: [
        {
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'alpha',
          scopes: ['repo'],
          state: 'success',
          tokenSource: 'keyring',
        },
        {
          active: false,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'beta',
          scopes: ['repo'],
          state: 'success',
          tokenSource: 'keyring',
        },
      ],
      hasMultipleGithubAccounts: true,
      isAuthenticated: true,
      loginActionLabel: connectMessages.addAnotherAccountButton,
      status: createStatus({ authenticated: true }),
    })

    expect(screen.getByText(connectMessages.accountCardTitle)).toBeDefined()
    expect(screen.getByText('alpha')).toBeDefined()
    expect(screen.getByText('beta')).toBeDefined()
    expect(screen.getByText(connectMessages.currentAccountBadge)).toBeDefined()
    expect(
      screen.getByRole('button', { name: connectMessages.switchAccountTitle }),
    ).toBeDefined()
  })

  it('keeps logout all and add account together in the authenticated card footer', () => {
    renderScreen({
      activeGithubAccount: createGithubAccount({
        active: true,
        login: 'alpha',
      }),
      githubAccounts: [
        createGithubAccount({
          active: true,
          login: 'alpha',
        }),
        createGithubAccount({ login: 'beta' }),
      ],
      hasMultipleGithubAccounts: true,
      isAuthenticated: true,
      loginActionLabel: connectMessages.addAnotherAccountButton,
      status: createStatus({ authenticated: true }),
    })

    const logoutAllButton = screen.getByRole('button', {
      name: connectMessages.logoutAllButton,
    })
    const addAnotherButton = screen.getByRole('button', {
      name: connectMessages.addAnotherAccountButton,
    })

    expect(logoutAllButton.closest('[data-slot="card-footer"]')).toBe(
      addAnotherButton.closest('[data-slot="card-footer"]'),
    )
    expect(screen.queryByText(connectMessages.logoutSectionTitle)).toBeNull()
  })

  it('renders the logout dialog copy from the screen model', () => {
    renderScreen({
      isAuthenticated: true,
      pendingLogoutAction: {
        login: 'beta',
        type: 'account',
      },
      pendingLogoutLogin: 'beta',
      status: createStatus({ authenticated: true }),
    })

    const dialog = screen.getByRole('alertdialog')

    expect(
      within(dialog).getByText(connectMessages.logoutAccountDialogTitle),
    ).toBeDefined()
    expect(
      within(dialog).getByText(connectMessages.logoutAccountDialogDescription),
    ).toBeDefined()
    expect(within(dialog).getByText('beta')).toBeDefined()
  })

  it('starts login when the initial login button is clicked', () => {
    const { controller } = renderScreen()

    fireEvent.click(
      screen.getByRole('button', { name: connectMessages.startButton }),
    )

    expect(controller.handleStartLogin).toHaveBeenCalledTimes(1)
    expect(controller.handleStartLogin).toHaveBeenCalledWith()
  })

  it('delegates manual web login actions to the controller handlers', () => {
    const { controller } = renderScreen({
      manualWebLaunch: {
        verificationCode: 'ABCD-EFGH',
        verificationUrl: 'https://github.com/login/device',
      },
    })

    fireEvent.click(
      screen.getByRole('button', { name: connectMessages.copyCodeButton }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: connectMessages.openBrowserButton }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: connectMessages.cancelLoginButton }),
    )

    expect(controller.handleCopyCode).toHaveBeenCalledTimes(1)
    expect(controller.handleOpenBrowser).toHaveBeenCalledTimes(1)
    expect(controller.handleCancelLogin).toHaveBeenCalledTimes(1)
  })

  it('delegates authenticated account actions to the controller', () => {
    const { controller } = renderScreen({
      activeGithubAccount: createGithubAccount({
        active: true,
        login: 'alpha',
      }),
      githubAccounts: [
        createGithubAccount({
          active: true,
          login: 'alpha',
        }),
        createGithubAccount({ login: 'beta' }),
      ],
      hasMultipleGithubAccounts: true,
      isAuthenticated: true,
      loginActionLabel: connectMessages.addAnotherAccountButton,
      status: createStatus({ authenticated: true }),
    })

    fireEvent.click(
      screen.getByRole('button', { name: connectMessages.switchAccountTitle }),
    )
    fireEvent.click(
      screen.getAllByRole('button', {
        name: connectMessages.logoutAccountButton,
      })[1],
    )
    fireEvent.click(
      screen.getByRole('button', { name: connectMessages.logoutAllButton }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: connectMessages.addAnotherAccountButton,
      }),
    )

    expect(controller.handleSwitchAccount).toHaveBeenCalledTimes(1)
    expect(controller.handleSwitchAccount).toHaveBeenCalledWith('beta')
    expect(controller.setPendingLogoutAction).toHaveBeenNthCalledWith(1, {
      login: 'beta',
      type: 'account',
    })
    expect(controller.setPendingLogoutAction).toHaveBeenNthCalledWith(2, {
      type: 'all',
    })
    expect(controller.handleStartLogin).toHaveBeenCalledTimes(1)
    expect(controller.handleStartLogin).toHaveBeenCalledWith(true)
  })

  it('delegates logout confirmation to the controller handler', () => {
    const { controller } = renderScreen({
      isAuthenticated: true,
      pendingLogoutAction: {
        login: 'beta',
        type: 'account',
      },
      pendingLogoutLogin: 'beta',
      status: createStatus({ authenticated: true }),
    })

    fireEvent.click(
      screen.getByRole('button', {
        name: connectMessages.logoutAccountConfirmButton,
      }),
    )

    expect(controller.handleConfirmLogout).toHaveBeenCalledTimes(1)
  })
})

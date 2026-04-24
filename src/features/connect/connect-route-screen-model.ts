import type { AppMessages } from '#/messages'
import type { GhAuthAccount } from '#/server/gh-auth.server'
import type { useConnectController } from './use-connect-controller'

type ConnectController = ReturnType<typeof useConnectController>

export type ConnectRouteScreenFlow =
  | {
      kind: 'install-required'
      installUrl: string
    }
  | {
      kind: 'manual-web-login'
      disableActions: boolean
      isCancelling: boolean
      onCancel: () => void
      onCopyCode: () => void
      onOpenBrowser: () => void
      showWaiting: boolean
      verificationCode: string
    }
  | {
      kind: 'authenticated'
      accounts: GhAuthAccount[]
      disableActions: boolean
      isLaunching: boolean
      isLoggingOut: boolean
      loginActionLabel: string
      onAddAccount: () => void
      onLogoutAccount: (login: string) => void
      onLogoutAll: () => void
      onSwitchAccount: (login: string) => void
      showLogoutAll: boolean
      showSwitchAction: boolean
      switchingAccountLogin: string | null
    }
  | {
      kind: 'initial-login'
      disabled: boolean
      isLoading: boolean
      onStart: () => void
    }

export type ConnectRouteScreenModel = {
  connectMessages: AppMessages['connect']
  errorBannerMessage: string | null
  flow: ConnectRouteScreenFlow
  logoutDialog: {
    confirmLabel: string
    description: string
    isLoggingOut: boolean
    onConfirm: () => void
    onOpenChange: (open: boolean) => void
    open: boolean
    pendingLogin: string | null
    title: string
  }
}

function createConnectRouteScreenFlow({
  controller,
}: {
  controller: ConnectController
}): ConnectRouteScreenFlow {
  if (!controller.status.ghInstalled) {
    return {
      installUrl: controller.status.installUrl,
      kind: 'install-required',
    }
  }

  if (controller.manualWebLaunch) {
    return {
      disableActions: controller.isBusy,
      isCancelling: controller.isCancellingLogin,
      kind: 'manual-web-login',
      onCancel: () => {
        void controller.handleCancelLogin()
      },
      onCopyCode: controller.handleCopyCode,
      onOpenBrowser: controller.handleOpenBrowser,
      showWaiting: controller.hasReturnedFromBrowser,
      verificationCode: controller.manualWebLaunch.verificationCode,
    }
  }

  if (controller.isAuthenticated) {
    return {
      accounts: controller.githubAccounts,
      disableActions: controller.isBusy,
      isLaunching: controller.isLaunching,
      isLoggingOut: controller.isLoggingOut,
      kind: 'authenticated',
      loginActionLabel: controller.loginActionLabel,
      onAddAccount: () => {
        void controller.handleStartLogin(true)
      },
      onLogoutAccount: (login: string) => {
        controller.setPendingLogoutAction({
          login,
          type: 'account',
        })
      },
      onLogoutAll: () => {
        controller.setPendingLogoutAction({ type: 'all' })
      },
      onSwitchAccount: (login: string) => {
        void controller.handleSwitchAccount(login)
      },
      showLogoutAll: controller.hasMultipleGithubAccounts,
      showSwitchAction: controller.hasMultipleGithubAccounts,
      switchingAccountLogin: controller.switchingAccountLogin,
    }
  }

  return {
    disabled: controller.isBusy,
    isLoading: controller.isLaunching,
    kind: 'initial-login',
    onStart: () => {
      void controller.handleStartLogin()
    },
  }
}

export function createConnectRouteScreenModel({
  connectMessages,
  controller,
}: {
  connectMessages: AppMessages['connect']
  controller: ConnectController
}): ConnectRouteScreenModel {
  const pendingLogoutAction = controller.pendingLogoutAction

  return {
    connectMessages,
    errorBannerMessage:
      controller.phase === 'error' ? controller.errorMessage : null,
    flow: createConnectRouteScreenFlow({ controller }),
    logoutDialog: {
      confirmLabel:
        pendingLogoutAction?.type === 'all'
          ? connectMessages.logoutAllConfirmButton
          : connectMessages.logoutAccountConfirmButton,
      description:
        pendingLogoutAction?.type === 'all'
          ? connectMessages.logoutAllDialogDescription
          : connectMessages.logoutAccountDialogDescription,
      isLoggingOut: controller.isLoggingOut,
      onConfirm: () => {
        void controller.handleConfirmLogout()
      },
      onOpenChange: (open: boolean) => {
        if (!open && !controller.isLoggingOut) {
          controller.setPendingLogoutAction(null)
        }
      },
      open: pendingLogoutAction !== null,
      pendingLogin: controller.pendingLogoutLogin,
      title:
        pendingLogoutAction?.type === 'all'
          ? connectMessages.logoutAllDialogTitle
          : connectMessages.logoutAccountDialogTitle,
    },
  }
}

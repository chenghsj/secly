import { useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { AppMessages } from '#/messages'
import {
  cancelLocalGhAuthLogin,
  logoutLocalGhAccount,
  logoutLocalGhAllAccounts,
  startLocalGhAuthLogin,
  switchLocalGhAuthAccount,
  waitForLocalGhAuthLoginCompletion,
} from '#/server/gh-auth.functions'
import type {
  GhAuthAccount,
  GhAuthLaunchResult,
  GhAuthStatus,
} from '#/server/gh-auth.server'

type ConnectPhase = 'error' | 'idle' | 'launched' | 'launching'

type LaunchBaseline = {
  accountSignature: string
  activeLogin: string | null
}

type PendingLogoutAction =
  | {
      login: string
      type: 'account'
    }
  | {
      type: 'all'
    }
  | null

const GH_HOSTNAME_FALLBACK = 'github.com'
const LOGIN_COMPLETION_WAIT_TIMEOUT_MS = 25000

export function buildGithubAccountSignature(accounts: GhAuthAccount[]) {
  return accounts
    .map(
      (account) =>
        `${account.host}:${account.login}:${account.state}:${account.active ? '1' : '0'}`,
    )
    .sort()
    .join('|')
}

export function getActiveGithubAccountIdentity(
  status: Pick<GhAuthStatus, 'activeAccount' | 'authenticated'>,
) {
  return status.authenticated &&
    status.activeAccount?.host === GH_HOSTNAME_FALLBACK
    ? `${status.activeAccount.host}:${status.activeAccount.login}:${status.activeAccount.state}`
    : null
}

export function getGithubAccounts(status: GhAuthStatus) {
  return status.knownAccounts
    .filter(
      (account) =>
        account.host === GH_HOSTNAME_FALLBACK &&
        (account.active || account.state === 'success'),
    )
    .sort((left, right) => {
      if (left.active !== right.active) {
        return left.active ? -1 : 1
      }

      return left.login.localeCompare(right.login)
    })
}

export function buildConnectStatusSnapshot(status: GhAuthStatus) {
  return [
    status.ghInstalled ? '1' : '0',
    status.authenticated ? '1' : '0',
    getActiveGithubAccountIdentity(status) ?? '-',
    buildGithubAccountSignature(getGithubAccounts(status)),
    status.issues.join('|'),
  ].join('|')
}

export function useConnectController({
  initialStatus,
  messages,
}: {
  initialStatus: GhAuthStatus
  messages: AppMessages['connect']
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<ConnectPhase>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<GhAuthStatus>(initialStatus)
  const [launchResult, setLaunchResult] = useState<GhAuthLaunchResult | null>(
    null,
  )
  const githubAccounts = useMemo(() => getGithubAccounts(status), [status])
  const githubAccountSignature = useMemo(
    () => buildGithubAccountSignature(githubAccounts),
    [githubAccounts],
  )
  const [switchingAccountLogin, setSwitchingAccountLogin] = useState<
    string | null
  >(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isCancellingLogin, setIsCancellingLogin] = useState(false)
  const [launchBaseline, setLaunchBaseline] = useState<LaunchBaseline | null>(
    null,
  )
  const [pendingLogoutAction, setPendingLogoutAction] =
    useState<PendingLogoutAction>(null)
  const [hasReturnedFromBrowser, setHasReturnedFromBrowser] = useState(false)
  const shellSyncInFlightRef = useRef(false)
  const loaderStatusSnapshotRef = useRef(
    buildConnectStatusSnapshot(initialStatus),
  )

  const activeGithubAccount =
    status.activeAccount?.host === GH_HOSTNAME_FALLBACK
      ? status.activeAccount
      : null
  const activeGithubAccountIdentity = getActiveGithubAccountIdentity(status)
  const loaderStatusSnapshot = buildConnectStatusSnapshot(initialStatus)
  const loaderActiveGithubAccount =
    initialStatus.activeAccount?.host === GH_HOSTNAME_FALLBACK
      ? initialStatus.activeAccount
      : null
  const loaderActiveGithubAccountIdentity =
    getActiveGithubAccountIdentity(initialStatus)
  const isAuthenticated = status.authenticated && activeGithubAccount !== null
  const loaderIsAuthenticated =
    initialStatus.authenticated && loaderActiveGithubAccount !== null
  const isLaunching = phase === 'launching'
  const isSwitchingAccount = switchingAccountLogin !== null
  const isBusy =
    isLaunching || isSwitchingAccount || isLoggingOut || isCancellingLogin
  const hasMultipleGithubAccounts = githubAccounts.length > 1
  const loginActionLabel = isAuthenticated
    ? messages.addAnotherAccountButton
    : messages.startButton
  const pendingLogoutLogin =
    pendingLogoutAction?.type === 'account' ? pendingLogoutAction.login : null
  const manualWebLaunch =
    launchResult?.method === 'manual-web' &&
    launchResult.verificationCode &&
    launchResult.verificationUrl
      ? {
          verificationCode: launchResult.verificationCode,
          verificationUrl: launchResult.verificationUrl,
        }
      : null


  useEffect(() => {
    if (!launchBaseline || phase !== 'launched') {
      return
    }

    const activeLogin = status.activeAccount?.login ?? null

    if (
      launchBaseline.accountSignature !== githubAccountSignature ||
      launchBaseline.activeLogin !== activeLogin
    ) {
      setLaunchBaseline(null)
      setLaunchResult(null)
      setPhase('idle')
      setErrorMessage(null)
    }
  }, [
    githubAccountSignature,
    launchBaseline,
    phase,
    status.activeAccount?.login,
  ])

  useEffect(() => {
    if (loaderStatusSnapshotRef.current === loaderStatusSnapshot) {
      return
    }

    loaderStatusSnapshotRef.current = loaderStatusSnapshot
    setStatus(initialStatus)
  }, [initialStatus, loaderStatusSnapshot])

  useEffect(() => {
    if (
      isAuthenticated === loaderIsAuthenticated &&
      activeGithubAccountIdentity === loaderActiveGithubAccountIdentity
    ) {
      shellSyncInFlightRef.current = false
      return
    }

    if (shellSyncInFlightRef.current) {
      return
    }

    shellSyncInFlightRef.current = true
    void router.invalidate().finally(() => {
      shellSyncInFlightRef.current = false
    })
  }, [
    activeGithubAccountIdentity,
    isAuthenticated,
    loaderActiveGithubAccountIdentity,
    loaderIsAuthenticated,
    router,
  ])

  useEffect(() => {
    const handleFocus = () => {
      setHasReturnedFromBrowser(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      setHasReturnedFromBrowser(true)
    }

    const handlePageShow = () => {
      setHasReturnedFromBrowser(true)
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const isAwaitingLogin = Boolean(manualWebLaunch) && phase === 'launched'

    if (!isAwaitingLogin) {
      return
    }

    let cancelled = false

    const loop = async () => {
      while (!cancelled) {
        try {
          const nextStatus = await waitForLocalGhAuthLoginCompletion({
            data: { timeoutMs: LOGIN_COMPLETION_WAIT_TIMEOUT_MS },
          })

          setStatus(nextStatus)

          if (nextStatus.authenticated) {
            return
          }
        } catch {
          return
        }
      }
    }

    void loop()

    return () => {
      cancelled = true
    }
  }, [manualWebLaunch, phase])

  const manualWebVerificationCode = manualWebLaunch?.verificationCode ?? null

  useEffect(() => {
    if (!manualWebVerificationCode) {
      setHasReturnedFromBrowser(false)
    }
  }, [manualWebVerificationCode])

  async function handleStartLogin(addAccount = false) {
    setErrorMessage(null)
    setLaunchResult(null)
    setPhase('launching')

    try {
      const result = await startLocalGhAuthLogin({
        data: {
          addAccount,
          presentation: 'manual-web',
        },
      })

      setLaunchResult(result)
      if (result.launched || result.method === 'manual-web') {
        setLaunchBaseline({
          accountSignature: githubAccountSignature,
          activeLogin: activeGithubAccount?.login ?? null,
        })
        setPhase('launched')
      } else {
        setLaunchBaseline(null)
        setPhase('idle')
      }
    } catch (error) {
      setLaunchBaseline(null)
      setPhase('error')
      setErrorMessage(
        error instanceof Error ? error.message : messages.startFailed,
      )
    }
  }

  async function handleSwitchAccount(login: string) {
    setErrorMessage(null)
    setLaunchResult(null)
    setSwitchingAccountLogin(login)

    try {
      const result = await switchLocalGhAuthAccount({
        data: { login },
      })

      setStatus(result.status)
      setLaunchBaseline(null)
      await router.invalidate()
      toast.success(messages.switchSuccess)
    } catch (error) {
      setPhase('error')
      setErrorMessage(
        error instanceof Error ? error.message : messages.switchFailed,
      )
    } finally {
      setSwitchingAccountLogin(null)
    }
  }

  async function handleCancelLogin() {
    setErrorMessage(null)
    setIsCancellingLogin(true)

    try {
      await cancelLocalGhAuthLogin()
      setLaunchBaseline(null)
      setLaunchResult(null)
      setPhase('idle')
    } catch (error) {
      setPhase('error')
      setErrorMessage(
        error instanceof Error ? error.message : messages.cancelLoginFailed,
      )
    } finally {
      setIsCancellingLogin(false)
    }
  }

  async function handleConfirmLogout() {
    if (!pendingLogoutAction) {
      return
    }

    setErrorMessage(null)
    setLaunchBaseline(null)
    setLaunchResult(null)
    setIsLoggingOut(true)

    try {
      if (pendingLogoutAction.type === 'account') {
        const result = await logoutLocalGhAccount({
          data: {
            login: pendingLogoutAction.login,
          },
        })
        setStatus(result.status)
        toast.success(messages.logoutAccountSuccess)
      } else {
        const result = await logoutLocalGhAllAccounts()
        setStatus(result.status)
        toast.success(messages.logoutAllSuccess)
      }

      setPendingLogoutAction(null)
      setPhase('idle')
      await router.invalidate()
    } catch (error) {
      setPhase('error')
      setErrorMessage(
        error instanceof Error ? error.message : messages.logoutFailed,
      )
    } finally {
      setIsLoggingOut(false)
    }
  }

  function handleCopyCode() {
    if (!manualWebLaunch) {
      return
    }

    try {
      void navigator.clipboard
        .writeText(manualWebLaunch.verificationCode)
        .then(() => toast.success(messages.oneTimeCodeCopied))
        .catch(() => toast.error(messages.oneTimeCodeCopyFailed))
    } catch {
      toast.error(messages.oneTimeCodeCopyFailed)
    }
  }

  function handleOpenBrowser() {
    if (!manualWebLaunch) {
      return
    }

    window.open(
      manualWebLaunch.verificationUrl,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return {
    activeGithubAccount,
    errorMessage,
    githubAccounts,
    handleCancelLogin,
    handleConfirmLogout,
    handleCopyCode,
    handleOpenBrowser,
    handleStartLogin,
    handleSwitchAccount,
    hasMultipleGithubAccounts,
    hasReturnedFromBrowser,
    isAuthenticated,
    isBusy,
    isCancellingLogin,
    isLaunching,
    isLoggingOut,
    loginActionLabel,
    manualWebLaunch,
    pendingLogoutAction,
    pendingLogoutLogin,
    phase,
    setPendingLogoutAction,
    status,
    switchingAccountLogin,
  }
}

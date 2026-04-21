import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  LogOutIcon,
  Repeat2Icon,
  ShieldCheckIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button, buttonVariants } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import { useAppPreferences } from '../components/app/app-settings-provider'
import { ConnectGuestCardControls } from '../components/app/connect-guest-card-controls'
import {
  cancelLocalGhAuthLogin,
  logoutLocalGhAccount,
  logoutLocalGhAllAccounts,
  refreshLocalGhAuthStatus,
  startLocalGhAuthLogin,
  switchLocalGhAuthAccount,
  waitForLocalGhAuthLoginCompletion,
} from '../server/gh-auth.functions'
import type {
  GhAuthAccount,
  GhAuthLaunchResult,
  GhAuthStatus,
} from '../server/gh-auth.server'

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

export const Route = createFileRoute('/connect')({
  loader: async () => ({ status: await refreshLocalGhAuthStatus() }),
  pendingComponent: ConnectRoutePending,
  wrapInSuspense: true,
  component: ConnectPage,
})

function getInitials(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return 'GH'
  }

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function buildAvatarUrl(login: string, host: string) {
  return `https://${host}/${login}.png?size=80`
}

function ButtonLoadingIcon() {
  return <Loader2Icon data-icon="inline-start" className="animate-spin" />
}

function buildGithubAccountSignature(accounts: GhAuthAccount[]) {
  return accounts
    .map(
      (account) =>
        `${account.host}:${account.login}:${account.state}:${account.active ? '1' : '0'}`,
    )
    .sort()
    .join('|')
}

function getActiveGithubAccountIdentity(
  status: Pick<GhAuthStatus, 'activeAccount' | 'authenticated'>,
) {
  return status.authenticated &&
    status.activeAccount?.host === GH_HOSTNAME_FALLBACK
    ? `${status.activeAccount.host}:${status.activeAccount.login}:${status.activeAccount.state}`
    : null
}

function getGithubAccounts(status: GhAuthStatus) {
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

function ConnectPage() {
  const router = useRouter()
  const { messages } = useAppPreferences()
  const { status: initialStatus } = Route.useLoaderData()
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
  const refreshFollowUpTimeoutRef = useRef<number | null>(null)
  const awaitingLoginInFlightRef = useRef(false)
  const shellSyncInFlightRef = useRef(false)

  const activeGithubAccount =
    status.activeAccount?.host === GH_HOSTNAME_FALLBACK
      ? status.activeAccount
      : null
  const activeGithubAccountIdentity = getActiveGithubAccountIdentity(status)
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
    ? messages.connect.addAnotherAccountButton
    : messages.connect.startButton
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

  const clearRefreshFollowUp = () => {
    if (refreshFollowUpTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(refreshFollowUpTimeoutRef.current)
    refreshFollowUpTimeoutRef.current = null
  }

  const refreshAuthStatus = () => {
    void refreshLocalGhAuthStatus()
      .then((nextStatus) => {
        setStatus(nextStatus)
      })
      .catch(() => {
        setPhase('error')
        setErrorMessage(messages.connect.refreshFailed)
      })
  }

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
    const refreshOnReturn = () => {
      clearRefreshFollowUp()
      refreshAuthStatus()
    }

    const handleFocus = () => {
      refreshOnReturn()
      setHasReturnedFromBrowser(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      refreshOnReturn()
      setHasReturnedFromBrowser(true)
    }

    const handlePageShow = () => {
      refreshOnReturn()
      setHasReturnedFromBrowser(true)
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearRefreshFollowUp()
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const isAwaitingLogin = Boolean(manualWebLaunch) && phase === 'launched'

    if (!isAwaitingLogin) {
      awaitingLoginInFlightRef.current = false
      return
    }

    let cancelled = false
    awaitingLoginInFlightRef.current = true

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

    void loop().finally(() => {
      awaitingLoginInFlightRef.current = false
    })

    return () => {
      cancelled = true
    }
  }, [manualWebLaunch, phase])

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
        error instanceof Error ? error.message : messages.connect.startFailed,
      )
    }
  }

  async function handleSwitchAccount(login: string) {
    setErrorMessage(null)
    setLaunchResult(null)

    setSwitchingAccountLogin(login)

    try {
      const result = await switchLocalGhAuthAccount({
        data: {
          login,
        },
      })

      setStatus(result.status)
      setLaunchBaseline(null)
      await router.invalidate()
      toast.success(messages.connect.switchSuccess)
    } catch (error) {
      setPhase('error')
      setErrorMessage(
        error instanceof Error ? error.message : messages.connect.switchFailed,
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
        error instanceof Error
          ? error.message
          : messages.connect.cancelLoginFailed,
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
        toast.success(messages.connect.logoutAccountSuccess)
      } else {
        const result = await logoutLocalGhAllAccounts()
        setStatus(result.status)
        toast.success(messages.connect.logoutAllSuccess)
      }

      setPendingLogoutAction(null)
      setPhase('idle')
      await router.invalidate()
    } catch (error) {
      setPhase('error')
      setErrorMessage(
        error instanceof Error ? error.message : messages.connect.logoutFailed,
      )
    } finally {
      setIsLoggingOut(false)
    }
  }

  const manualWebVerificationCode = manualWebLaunch?.verificationCode ?? null

  useEffect(() => {
    if (!manualWebVerificationCode) {
      setHasReturnedFromBrowser(false)
    }
  }, [manualWebVerificationCode])

  function handleCopyCode() {
    if (!manualWebLaunch) {
      return
    }

    try {
      void navigator.clipboard
        .writeText(manualWebLaunch.verificationCode)
        .then(() => toast.success(messages.connect.oneTimeCodeCopied))
        .catch(() => toast.error(messages.connect.oneTimeCodeCopyFailed))
    } catch {
      toast.error(messages.connect.oneTimeCodeCopyFailed)
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

  return (
    <main
      className={`page-wrap flex min-h-full flex-1 px-4 py-8 sm:py-10 ${
        isAuthenticated
          ? 'items-start justify-center'
          : 'items-center justify-center'
      }`}
    >
      <div className="flex w-full max-w-3xl flex-col gap-4">
        {phase === 'error' && errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>{messages.connect.errorTitle}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {!status.ghInstalled ? (
          <InstallRequiredCard
            actionLabel={messages.connect.installButton}
            description={messages.connect.missingCliDescription}
            installUrl={status.installUrl}
            title={messages.connect.missingCliTitle}
          />
        ) : manualWebLaunch ? (
          <ManualWebLoginCard
            cancelLabel={messages.connect.cancelLoginButton}
            codeLabel={messages.connect.manualWebLoginCodeLabel}
            copyLabel={messages.connect.copyCodeButton}
            description={messages.connect.manualWebLoginDescription}
            disableActions={isBusy}
            isCancelling={isCancellingLogin}
            onCancel={() => void handleCancelLogin()}
            onCopyCode={handleCopyCode}
            onOpenBrowser={handleOpenBrowser}
            openBrowserLabel={messages.connect.openBrowserButton}
            showWaiting={hasReturnedFromBrowser}
            title={messages.connect.manualWebLoginTitle}
            verificationCode={manualWebLaunch.verificationCode}
            waitingLabel={messages.connect.manualWebLoginWaiting}
          />
        ) : isAuthenticated ? (
          <Card className="mx-auto w-full max-w-3xl">
            <CardHeader>
              <CardTitle>{messages.connect.accountCardTitle}</CardTitle>
              <CardDescription>
                {messages.connect.accountCardDescription}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <AccountListSection
                accounts={githubAccounts}
                currentBadgeLabel={messages.connect.currentAccountBadge}
                disableActions={isBusy}
                logoutLabel={messages.connect.logoutAccountButton}
                showSwitchAction={hasMultipleGithubAccounts}
                switchLabel={messages.connect.switchAccountTitle}
                switchingAccountLogin={switchingAccountLogin}
                onLogout={(login) =>
                  setPendingLogoutAction({
                    login,
                    type: 'account',
                  })
                }
                onSwitch={(login) => void handleSwitchAccount(login)}
              />

              {hasMultipleGithubAccounts ? (
                <LogoutActionsSection
                  disableLogoutAll={isBusy}
                  isLoggingOut={isLoggingOut}
                  logoutAllLabel={messages.connect.logoutAllButton}
                  onLogoutAll={() => setPendingLogoutAction({ type: 'all' })}
                  showLogoutAll={hasMultipleGithubAccounts}
                  title={messages.connect.logoutSectionTitle}
                />
              ) : null}
            </CardContent>

            <CardFooter className="justify-end gap-3">
              <Button
                variant="outline"
                disabled={isBusy}
                onClick={() => void handleStartLogin(true)}
              >
                {isLaunching ? (
                  <ButtonLoadingIcon />
                ) : (
                  <ShieldCheckIcon data-icon="inline-start" />
                )}
                {loginActionLabel}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <InitialLoginCard
            buttonLabel={messages.connect.startButton}
            description={messages.connect.notAuthenticatedDescription}
            disabled={isBusy}
            isLoading={isLaunching}
            onStart={() => void handleStartLogin()}
            title={messages.connect.notAuthenticatedTitle}
          />
        )}

        <AlertDialog
          open={pendingLogoutAction !== null}
          onOpenChange={(open) => {
            if (!open && !isLoggingOut) {
              setPendingLogoutAction(null)
            }
          }}
        >
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingLogoutAction?.type === 'all'
                  ? messages.connect.logoutAllDialogTitle
                  : messages.connect.logoutAccountDialogTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingLogoutAction?.type === 'all'
                  ? messages.connect.logoutAllDialogDescription
                  : messages.connect.logoutAccountDialogDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {pendingLogoutLogin ? (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
                {pendingLogoutLogin}
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel variant="ghost" disabled={isLoggingOut}>
                {messages.connect.logoutCancelButton}
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={isLoggingOut}
                onClick={() => void handleConfirmLogout()}
              >
                {isLoggingOut ? <ButtonLoadingIcon /> : null}
                {pendingLogoutAction?.type === 'all'
                  ? messages.connect.logoutAllConfirmButton
                  : messages.connect.logoutAccountConfirmButton}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  )
}

function AccountListSection({
  accounts,
  currentBadgeLabel,
  disableActions,
  logoutLabel,
  showSwitchAction,
  switchLabel,
  switchingAccountLogin,
  onLogout,
  onSwitch,
}: {
  accounts: GhAuthAccount[]
  currentBadgeLabel: string
  disableActions: boolean
  logoutLabel: string
  showSwitchAction: boolean
  switchLabel: string
  switchingAccountLogin: string | null
  onLogout: (login: string) => void
  onSwitch: (login: string) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      {accounts.map((account) => (
        <div
          key={`${account.host}:${account.login}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4"
        >
          <Avatar size="lg">
            <AvatarImage
              src={buildAvatarUrl(account.login, account.host)}
              alt={`${account.login} avatar`}
            />
            <AvatarFallback>{getInitials(account.login)}</AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-medium text-foreground">
                {account.login}
              </p>

              {account.active ? (
                <Badge className="shrink-0" variant="secondary">
                  {currentBadgeLabel}
                </Badge>
              ) : null}
            </div>

            <p className="truncate text-sm text-muted-foreground">
              {account.host}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {showSwitchAction && !account.active ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={disableActions}
                onClick={() => onSwitch(account.login)}
              >
                {switchingAccountLogin === account.login ? (
                  <ButtonLoadingIcon />
                ) : (
                  <Repeat2Icon data-icon="inline-start" />
                )}
                {switchLabel}
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              disabled={disableActions}
              onClick={() => onLogout(account.login)}
            >
              <LogOutIcon data-icon="inline-start" />
              {logoutLabel}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function InstallRequiredCard({
  actionLabel,
  description,
  installUrl,
  title,
}: {
  actionLabel: string
  description: string
  installUrl: string
  title: string
}) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={installUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonVariants({ variant: 'default' })} shrink-0 justify-center no-underline`}
        >
          {actionLabel}
        </a>

        <div className="flex justify-end">
          <ConnectGuestCardControls />
        </div>
      </CardFooter>
    </Card>
  )
}

function ConnectAuthFlowCard({
  children,
  description,
  footer,
  title,
}: {
  children?: ReactNode
  description: string
  footer: ReactNode
  title: string
}) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      {children ? (
        <CardContent className="flex flex-col gap-3">{children}</CardContent>
      ) : null}

      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {footer}
      </CardFooter>
    </Card>
  )
}

function InitialLoginCard({
  buttonLabel,
  description,
  disabled,
  isLoading,
  onStart,
  title,
}: {
  buttonLabel: string
  description: string
  disabled: boolean
  isLoading: boolean
  onStart: () => void
  title: string
}) {
  return (
    <ConnectAuthFlowCard
      description={description}
      footer={
        <>
          <Button className="shrink-0" disabled={disabled} onClick={onStart}>
            {isLoading ? (
              <ButtonLoadingIcon />
            ) : (
              <ShieldCheckIcon data-icon="inline-start" />
            )}
            {buttonLabel}
          </Button>

          <div className="flex justify-end">
            <ConnectGuestCardControls />
          </div>
        </>
      }
      title={title}
    />
  )
}

function ManualWebLoginCard({
  cancelLabel,
  codeLabel,
  copyLabel,
  description,
  disableActions,
  isCancelling,
  onCancel,
  onCopyCode,
  onOpenBrowser,
  openBrowserLabel,
  showWaiting,
  title,
  verificationCode,
  waitingLabel,
}: {
  cancelLabel: string
  codeLabel: string
  copyLabel: string
  description: string
  disableActions: boolean
  isCancelling: boolean
  onCancel: () => void
  onCopyCode: () => void
  onOpenBrowser: () => void
  openBrowserLabel: string
  showWaiting: boolean
  title: string
  verificationCode: string
  waitingLabel: string
}) {
  return (
    <ConnectAuthFlowCard
      description={description}
      footer={
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            className="w-full sm:w-auto"
            disabled={disableActions}
            onClick={onCopyCode}
          >
            <CopyIcon data-icon="inline-start" />
            {copyLabel}
          </Button>

          <Button
            className="w-full sm:w-auto"
            variant="outline"
            disabled={disableActions}
            onClick={onOpenBrowser}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            {openBrowserLabel}
          </Button>

          <Button
            className="sm:shrink-0"
            variant="ghost"
            disabled={disableActions}
            onClick={onCancel}
          >
            {isCancelling ? <ButtonLoadingIcon /> : null}
            {cancelLabel}
          </Button>
        </div>
      }
      title={title}
    >
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {codeLabel}
        </p>
        <p className="font-mono text-2xl font-semibold tracking-[0.3em] text-foreground">
          {verificationCode}
        </p>
      </div>

      {showWaiting ? (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          <span>{waitingLabel}</span>
        </div>
      ) : null}
    </ConnectAuthFlowCard>
  )
}

function LogoutActionsSection({
  disableLogoutAll,
  isLoggingOut,
  logoutAllLabel,
  onLogoutAll,
  showLogoutAll,
  title,
}: {
  disableLogoutAll: boolean
  isLoggingOut: boolean
  logoutAllLabel: string
  onLogoutAll: () => void
  showLogoutAll: boolean
  title: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">{title}</p>

      {showLogoutAll ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="destructive"
            disabled={disableLogoutAll}
            onClick={onLogoutAll}
          >
            {isLoggingOut ? (
              <ButtonLoadingIcon />
            ) : (
              <LogOutIcon data-icon="inline-start" />
            )}
            {logoutAllLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function ConnectRoutePending() {
  return (
    <main className="page-wrap flex min-h-full flex-1 items-start justify-center px-4 py-8 sm:py-10">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <Card className="mx-auto w-full max-w-3xl">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>

          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4"
                >
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>

          <CardFooter className="justify-end gap-3">
            <Skeleton className="h-9 w-40" />
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

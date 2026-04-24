import type { ReactNode } from 'react'
import {
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  LogOutIcon,
  Repeat2Icon,
  ShieldCheckIcon,
} from 'lucide-react'
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
import { ConnectGuestCardControls } from '#/components/app/connect-guest-card-controls'
import type { GhAuthAccount } from '#/server/gh-auth.server'
import type { ConnectRouteScreenModel } from './connect-route-screen-model'

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

function LogoutAllAccountsAction({
  disableLogoutAll,
  isLoggingOut,
  logoutAllLabel,
  onLogoutAll,
}: {
  disableLogoutAll: boolean
  isLoggingOut: boolean
  logoutAllLabel: string
  onLogoutAll: () => void
}) {
  return (
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
  )
}

export function ConnectRouteScreen({
  model,
}: {
  model: ConnectRouteScreenModel
}) {
  const { connectMessages, errorBannerMessage, flow, logoutDialog } = model

  return (
    <main
      className={`page-wrap flex min-h-full flex-1 px-4 py-8 sm:py-10 ${
        flow.kind === 'authenticated'
          ? 'items-start justify-center'
          : 'items-center justify-center'
      }`}
    >
      <div className="flex w-full max-w-3xl flex-col gap-4">
        {errorBannerMessage ? (
          <Alert variant="destructive">
            <AlertTitle>{connectMessages.errorTitle}</AlertTitle>
            <AlertDescription>{errorBannerMessage}</AlertDescription>
          </Alert>
        ) : null}

        {flow.kind === 'install-required' ? (
          <InstallRequiredCard
            actionLabel={connectMessages.installButton}
            description={connectMessages.missingCliDescription}
            installUrl={flow.installUrl}
            title={connectMessages.missingCliTitle}
          />
        ) : flow.kind === 'manual-web-login' ? (
          <ManualWebLoginCard
            cancelLabel={connectMessages.cancelLoginButton}
            codeLabel={connectMessages.manualWebLoginCodeLabel}
            copyLabel={connectMessages.copyCodeButton}
            description={connectMessages.manualWebLoginDescription}
            disableActions={flow.disableActions}
            isCancelling={flow.isCancelling}
            onCancel={flow.onCancel}
            onCopyCode={flow.onCopyCode}
            onOpenBrowser={flow.onOpenBrowser}
            openBrowserLabel={connectMessages.openBrowserButton}
            showWaiting={flow.showWaiting}
            title={connectMessages.manualWebLoginTitle}
            verificationCode={flow.verificationCode}
            waitingLabel={connectMessages.manualWebLoginWaiting}
          />
        ) : flow.kind === 'authenticated' ? (
          <Card className="mx-auto w-full max-w-3xl">
            <CardHeader>
              <CardTitle>{connectMessages.accountCardTitle}</CardTitle>
              <CardDescription>
                {connectMessages.accountCardDescription}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-6">
              <AccountListSection
                accounts={flow.accounts}
                currentBadgeLabel={connectMessages.currentAccountBadge}
                disableActions={flow.disableActions}
                logoutLabel={connectMessages.logoutAccountButton}
                showSwitchAction={flow.showSwitchAction}
                switchLabel={connectMessages.switchAccountTitle}
                switchingAccountLogin={flow.switchingAccountLogin}
                onLogout={flow.onLogoutAccount}
                onSwitch={flow.onSwitchAccount}
              />
            </CardContent>

            <CardFooter className="flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 justify-start">
                {flow.showLogoutAll ? (
                  <LogoutAllAccountsAction
                    disableLogoutAll={flow.disableActions}
                    isLoggingOut={flow.isLoggingOut}
                    logoutAllLabel={connectMessages.logoutAllButton}
                    onLogoutAll={flow.onLogoutAll}
                  />
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  disabled={flow.disableActions}
                  onClick={flow.onAddAccount}
                >
                  {flow.isLaunching ? (
                    <ButtonLoadingIcon />
                  ) : (
                    <ShieldCheckIcon data-icon="inline-start" />
                  )}
                  {flow.loginActionLabel}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ) : (
          <InitialLoginCard
            buttonLabel={connectMessages.startButton}
            description={connectMessages.notAuthenticatedDescription}
            disabled={flow.disabled}
            isLoading={flow.isLoading}
            onStart={flow.onStart}
            title={connectMessages.notAuthenticatedTitle}
          />
        )}

        <AlertDialog
          open={logoutDialog.open}
          onOpenChange={logoutDialog.onOpenChange}
        >
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>{logoutDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>
                {logoutDialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {logoutDialog.pendingLogin ? (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
                {logoutDialog.pendingLogin}
              </div>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel
                variant="ghost"
                disabled={logoutDialog.isLoggingOut}
              >
                {connectMessages.logoutCancelButton}
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                variant="destructive"
                disabled={logoutDialog.isLoggingOut}
                onClick={logoutDialog.onConfirm}
              >
                {logoutDialog.isLoggingOut ? <ButtonLoadingIcon /> : null}
                {logoutDialog.confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  )
}

export function ConnectRoutePendingScreen() {
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

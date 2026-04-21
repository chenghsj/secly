import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  BookOpenIcon,
  BuildingIcon,
  CheckIcon,
  ExternalLinkIcon,
  FolderGitIcon,
  LogInIcon,
  Loader2Icon,
  LogOutIcon,
  RefreshCwIcon,
  Repeat2Icon,
  UserCogIcon,
  UserRoundIcon,
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
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  logoutLocalGhCurrentAccount,
  refreshLocalGhAuthStatus,
  switchLocalGhAuthAccount,
} from '../../server/gh-auth.functions'
import type { GhAuthAccount, GhAuthStatus } from '../../server/gh-auth.server'
import { useAppPreferences } from './app-settings-provider'

const GH_HOSTNAME_FALLBACK = 'github.com'

function ButtonLoadingIcon() {
  return <Loader2Icon data-icon="inline-start" className="animate-spin" />
}

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

function buildAvatarUrl(login: string, host: string, size = 64) {
  return `https://${host}/${login}.png?size=${size}`
}

function buildProfileUrl(account: GhAuthAccount) {
  return `https://${account.host}/${account.login}`
}

function buildRepositoriesUrl(account: GhAuthAccount) {
  return `https://${account.host}/${account.login}?tab=repositories`
}

function buildOrganizationsUrl(account: GhAuthAccount) {
  return `https://${account.host}/settings/organizations`
}

function readAuthStatusFromMatches(
  matches: Array<{ loaderData?: unknown }>,
): GhAuthStatus | null {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const data = matches[index]?.loaderData as
      | { status?: GhAuthStatus }
      | undefined
    if (data?.status) {
      return data.status
    }
  }
  return null
}

function getSwitchableAccounts(status: GhAuthStatus) {
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

function getActiveGithubAccountIdentity(status: GhAuthStatus | null) {
  return status?.authenticated &&
    status.activeAccount?.host === GH_HOSTNAME_FALLBACK
    ? `${status.activeAccount.host}:${status.activeAccount.login}:${status.activeAccount.state}`
    : null
}

export function AccountMenu() {
  const { messages } = useAppPreferences()
  const router = useRouter()
  const routeStatus = useRouterState({
    select: (state) => readAuthStatusFromMatches(state.matches),
  })
  const [displayStatus, setDisplayStatus] = useState<GhAuthStatus | null>(
    routeStatus,
  )
  const [isSwitching, setIsSwitching] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false)

  useEffect(() => {
    setDisplayStatus(routeStatus)
  }, [routeStatus])

  const accountMenuMessages = messages.accountMenu
  const connectMessages = messages.connect
  const status = displayStatus
  const activeAccount =
    status?.activeAccount &&
    status.activeAccount.host === GH_HOSTNAME_FALLBACK &&
    status.authenticated
      ? status.activeAccount
      : null
  const switchableAccounts = status ? getSwitchableAccounts(status) : []
  const hasMultipleAccounts = switchableAccounts.length > 1

  async function handleSwitchAccount(login: string) {
    if (isSwitching) {
      return
    }

    setIsSwitching(login)
    try {
      const result = await switchLocalGhAuthAccount({ data: { login } })
      setDisplayStatus(result.status)
      setIsOpen(false)
      await router.invalidate()
      toast.success(accountMenuMessages.switchSuccess)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : accountMenuMessages.switchFailed,
      )
    } finally {
      setIsSwitching(null)
    }
  }

  async function handleRefreshStatus() {
    if (isRefreshing) {
      return
    }

    setIsRefreshing(true)
    try {
      const previousActiveAccountIdentity =
        getActiveGithubAccountIdentity(status)
      const previousAuthenticated = Boolean(status?.authenticated)
      const nextStatus = await refreshLocalGhAuthStatus()
      setDisplayStatus(nextStatus)
      setIsOpen(false)

      if (
        previousAuthenticated !== nextStatus.authenticated ||
        previousActiveAccountIdentity !==
          getActiveGithubAccountIdentity(nextStatus)
      ) {
        await router.invalidate()
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : accountMenuMessages.refreshFailed,
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleSignOut() {
    if (isSigningOut || !activeAccount) {
      return
    }

    setIsSigningOut(true)
    try {
      const result = await logoutLocalGhCurrentAccount()
      setDisplayStatus(result.status)
      setIsSignOutDialogOpen(false)
      setIsOpen(false)
      await router.invalidate()
      toast.success(connectMessages.logoutCurrentSuccess)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : connectMessages.logoutFailed,
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          aria-label={accountMenuMessages.triggerLabel}
          className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {activeAccount ? (
            <Avatar size="sm">
              <AvatarImage
                src={buildAvatarUrl(activeAccount.login, activeAccount.host)}
                alt={`${activeAccount.login} avatar`}
              />
              <AvatarFallback>
                {getInitials(activeAccount.login)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
              <UserRoundIcon className="size-4" />
            </span>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-64">
          {activeAccount ? (
            <>
              <div className="flex items-center gap-3 p-2">
                <Avatar>
                  <AvatarImage
                    src={buildAvatarUrl(
                      activeAccount.login,
                      activeAccount.host,
                    )}
                    alt={`${activeAccount.login} avatar`}
                  />
                  <AvatarFallback>
                    {getInitials(activeAccount.login)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground">
                    {activeAccount.login}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeAccount.host}
                  </span>
                </div>
              </div>

              {hasMultipleAccounts ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Repeat2Icon />
                      <span>{accountMenuMessages.switchAccount}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64">
                      {switchableAccounts.map((account) => {
                        const isActive = account.active
                        const isAccountSwitching = isSwitching === account.login

                        return (
                          <DropdownMenuItem
                            key={`${account.host}:${account.login}`}
                            closeOnClick={false}
                            disabled={isActive || isAccountSwitching}
                            onClick={() =>
                              void handleSwitchAccount(account.login)
                            }
                          >
                            <Avatar size="sm">
                              <AvatarImage
                                src={buildAvatarUrl(
                                  account.login,
                                  account.host,
                                  48,
                                )}
                                alt={`${account.login} avatar`}
                              />
                              <AvatarFallback>
                                {getInitials(account.login)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-sm">
                                {account.login}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {account.host}
                              </span>
                            </div>
                            {isActive ? (
                              <Badge
                                variant="secondary"
                                className="ml-auto shrink-0"
                              >
                                {accountMenuMessages.activeBadge}
                              </Badge>
                            ) : (
                              <CheckIcon className="ml-auto opacity-0" />
                            )}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              ) : null}

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  render={
                    <a
                      href={buildProfileUrl(activeAccount)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={accountMenuMessages.openProfile}
                    />
                  }
                >
                  <UserRoundIcon />
                  <span>{accountMenuMessages.openProfile}</span>
                  <ExternalLinkIcon className="ml-auto opacity-60" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <a
                      href={buildRepositoriesUrl(activeAccount)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={accountMenuMessages.openRepositories}
                    />
                  }
                >
                  <FolderGitIcon />
                  <span>{accountMenuMessages.openRepositories}</span>
                  <ExternalLinkIcon className="ml-auto opacity-60" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <a
                      href={buildOrganizationsUrl(activeAccount)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={accountMenuMessages.openOrganizations}
                    />
                  }
                >
                  <BuildingIcon />
                  <span>{accountMenuMessages.openOrganizations}</span>
                  <ExternalLinkIcon className="ml-auto opacity-60" />
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem render={<Link to="/connect" />}>
                  <UserCogIcon />
                  <span>{accountMenuMessages.manageAccounts}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  closeOnClick={false}
                  disabled={isRefreshing}
                  onClick={() => void handleRefreshStatus()}
                >
                  <RefreshCwIcon
                    className={isRefreshing ? 'animate-spin' : undefined}
                  />
                  <span>{accountMenuMessages.refreshStatus}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <a
                      href="https://cli.github.com/manual/"
                      target="_blank"
                      rel="noopener noreferrer"
                      title={accountMenuMessages.githubCliDocs}
                    />
                  }
                >
                  <BookOpenIcon />
                  <span>{accountMenuMessages.githubCliDocs}</span>
                  <ExternalLinkIcon className="ml-auto opacity-60" />
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                variant="destructive"
                disabled={isSigningOut}
                onClick={() => {
                  setIsOpen(false)
                  setIsSignOutDialogOpen(true)
                }}
              >
                <LogOutIcon />
                <span>{accountMenuMessages.signOut}</span>
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <div className="px-2 py-2 text-sm text-muted-foreground">
                {accountMenuMessages.noActiveAccount}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link to="/connect" />}>
                <LogInIcon />
                <span>{accountMenuMessages.signIn}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={isSignOutDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isSigningOut) {
            setIsSignOutDialogOpen(false)
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {connectMessages.logoutAccountDialogTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {connectMessages.logoutAccountDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {activeAccount ? (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
              {activeAccount.login}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isSigningOut}>
              {connectMessages.logoutCancelButton}
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
            >
              {isSigningOut ? <ButtonLoadingIcon /> : null}
              {connectMessages.logoutAccountConfirmButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

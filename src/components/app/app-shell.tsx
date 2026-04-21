import type { CSSProperties, ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '#/components/ui/sidebar'
import { TooltipProvider } from '#/components/ui/tooltip'
import { AppSidebar } from './app-sidebar'
import {
  getConnectRouteStatus,
  shouldUseConnectFullscreenShell,
} from './app-shell-layout'
import { AppSettingsProvider, useAppPreferences } from './app-settings-provider'
import { AccountMenu } from './account-menu'
import { LocaleSwitcher } from './locale-switcher'
import { ThemeSwitcher } from './theme-switcher'

const APP_SHELL_HEADER_HEIGHT = '3.5rem'
const APP_SHELL_INSET_BLOCK_GAP = '1rem'

function AppShellBody({ children }: { children: ReactNode }) {
  const { messages, resolvedTheme } = useAppPreferences()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const connectStatus = useRouterState({
    select: (state) => {
      if (!state.location.pathname.startsWith('/connect')) {
        return null
      }

      const currentMatch = state.matches[state.matches.length - 1]
      return getConnectRouteStatus(currentMatch.loaderData)
    },
  })
  const useFullscreenConnectShell = shouldUseConnectFullscreenShell(
    pathname,
    connectStatus,
  )

  const currentSection = pathname.startsWith('/connect')
    ? {
        title: messages.nav.account,
        description: messages.connect.shellDescription,
      }
    : {
        title: messages.nav.variables,
        description: messages.variables.shellDescription,
      }

  const toaster = (
    <Toaster
      position="top-center"
      richColors
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  )

  if (useFullscreenConnectShell) {
    return (
      <TooltipProvider>
        <div className="min-h-dvh bg-background">
          <div className="flex min-h-dvh flex-col">{children}</div>
          {toaster}
        </div>
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <SidebarProvider className="h-dvh min-h-0 overflow-hidden">
        <AppSidebar />
        <SidebarInset
          className="h-full min-h-0 overflow-hidden md:h-[calc(100dvh-var(--app-shell-inset-block-gap))]"
          style={
            {
              '--app-shell-header-height': APP_SHELL_HEADER_HEIGHT,
              '--app-shell-inset-block-gap': APP_SHELL_INSET_BLOCK_GAP,
            } as CSSProperties
          }
        >
          <header className="h-14 shrink-0 rounded-t-[inherit] border-b bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
            <div className="flex h-full items-center gap-3 px-4">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {currentSection.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentSection.description}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-1">
                <ThemeSwitcher />
                <LocaleSwitcher />
                <div className="mx-1 h-4 w-px bg-border" />
                <AccountMenu />
              </div>
            </div>
          </header>

          <main className="h-[calc(100%-var(--app-shell-header-height))] min-h-0 overflow-y-auto">
            <div className="flex min-h-full flex-col">{children}</div>
          </main>
        </SidebarInset>

        {toaster}
      </SidebarProvider>
    </TooltipProvider>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppSettingsProvider>
      <AppShellBody>{children}</AppShellBody>
    </AppSettingsProvider>
  )
}

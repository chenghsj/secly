import { Link, useRouterState } from '@tanstack/react-router'
import { CircleUserRoundIcon, KeyRoundIcon } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '#/components/ui/sidebar'
import { APP_MONOGRAM, APP_NAME } from '#/lib/product'
import { useAppPreferences } from './app-settings-provider'

const workspaceLinks = [
  {
    icon: KeyRoundIcon,
    to: '/variables',
    labelKey: 'variables',
  },
  {
    icon: CircleUserRoundIcon,
    to: '/connect',
    labelKey: 'account',
  },
] as const

export function AppSidebar() {
  const { messages } = useAppPreferences()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="px-3 pt-3 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<div />}
              size="lg"
              className="rounded-2xl bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {APP_MONOGRAM}
              </div>
              <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">{APP_NAME}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  {messages.variables.sidebarSubtitle}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="gap-1 px-3 pt-2 pb-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {workspaceLinks.map((item) => {
                const isActive =
                  item.to === '/variables'
                    ? pathname === '/variables'
                    : pathname === item.to

                const label =
                  item.labelKey === 'variables'
                    ? messages.nav.variables
                    : messages.nav.account

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      render={
                        item.to === '/variables' ? (
                          <Link to={item.to} search={() => ({})} />
                        ) : (
                          <Link to={item.to} />
                        )
                      }
                      isActive={isActive}
                      tooltip={label}
                      className="rounded-xl data-active:shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))]"
                    >
                      <item.icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}

// @vitest-environment jsdom

import { cloneElement, isValidElement, type ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { AccountGitHubLinksSubmenu } from './account-menu'

vi.mock('#/components/ui/dropdown-menu', () => {
  function renderSlot(render: ReactNode | undefined, children: ReactNode) {
    if (isValidElement(render)) {
      return cloneElement(render, undefined, children)
    }

    return <div>{children}</div>
  }

  return {
    DropdownMenu: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuTrigger: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    DropdownMenuContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuGroup: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuItem: ({
      children,
      render,
    }: {
      children: ReactNode
      render?: ReactNode
    }) => renderSlot(render, children),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuSub: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSubTrigger: ({ children }: { children: ReactNode }) => (
      <button type="button">{children}</button>
    ),
    DropdownMenuSubContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
  }
})

describe('AccountMenu', () => {
  it('groups GitHub external links under an Open on GitHub submenu', () => {
    render(
      <AccountGitHubLinksSubmenu
        activeAccount={{
          active: true,
          gitProtocol: 'https',
          host: 'github.com',
          login: 'chenghsj',
          scopes: ['repo'],
          state: 'success',
          tokenSource: 'keyring',
        }}
        accountMenuMessages={translations.en.accountMenu}
      />,
    )

    expect(screen.getByText('Open on GitHub')).toBeDefined()
    expect(screen.getByText('Your profile')).toBeDefined()
    expect(screen.getByText('Your repositories')).toBeDefined()
    expect(screen.getByText('Your organizations')).toBeDefined()
  })
})

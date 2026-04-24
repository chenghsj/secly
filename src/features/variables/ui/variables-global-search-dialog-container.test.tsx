// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesGlobalSearchDialogContainer } from './variables-global-search-dialog-container'

const capturedProps = vi.fn()

vi.mock('./variables-dialogs', () => ({
  VariablesGlobalSearchDialog: (props: unknown) => {
    capturedProps(props)
    return <div data-testid="variables-global-search-dialog" />
  },
}))

describe('VariablesGlobalSearchDialogContainer', () => {
  it('assembles content and state props for the global search dialog', () => {
    const variablesMessages = translations.en.variables
    const onRetry = vi.fn()

    render(
      <VariablesGlobalSearchDialogContainer
        actions={{
          onClearSearch: vi.fn(),
          onGlobalSearchQueryChange: vi.fn(),
          onOpenChange: vi.fn(),
          onRetry,
          onSaveResult: vi.fn(),
        }}
        filteredResults={[]}
        globalSearchError={null}
        globalSearchInputId="global-entry-search-input"
        globalSearchQuery="api"
        isGlobalSearchDialogOpen
        isGlobalSearchLoading={false}
        locale="en"
        selectedRepository="acme/repo"
        trimmedGlobalSearchQuery="api"
        variablesMessages={variablesMessages}
      />,
    )

    const dialogProps = capturedProps.mock.calls.at(-1)?.[0] as {
      actions: { onRetry: () => void }
      content: { locale: string }
      state: { globalSearchInputId: string; selectedRepository: string }
    }

    expect(dialogProps.content).toEqual({ locale: 'en' })
    expect(dialogProps.state).toEqual(
      expect.objectContaining({
        globalSearchInputId: 'global-entry-search-input',
        selectedRepository: 'acme/repo',
      }),
    )
    expect(dialogProps.actions.onRetry).toBe(onRetry)
  })
})

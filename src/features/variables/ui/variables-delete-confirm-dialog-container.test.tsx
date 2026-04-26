// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesDeleteConfirmDialogContainer } from './variables-delete-confirm-dialog-container'

const capturedProps = vi.fn()

vi.mock('./variables-dialogs', () => ({
  VariablesDeleteConfirmDialog: (props: unknown) => {
    capturedProps(props)
    return <div data-testid="variables-delete-confirm-dialog" />
  },
}))

describe('VariablesDeleteConfirmDialogContainer', () => {
  it('passes delete confirm actions and state through to the dialog', () => {
    const variablesMessages = translations.en.variables
    const onConfirm = vi.fn()

    render(
      <VariablesDeleteConfirmDialogContainer
        actions={{
          onConfirm,
          onConfirmationValueChange: vi.fn(),
          onCopyConfirmationValue: vi.fn(),
          onOpenChange: vi.fn(),
        }}
        state={{
          deleteConfirmationInputId: 'delete-confirmation-input',
          deleteConfirmationValue: 'preview',
          isDeleteConfirming: false,
          isTypedDeleteConfirmationMatched: true,
          pendingDelete: null,
          pendingDeleteActionLabel: variablesMessages.actions.delete,
          pendingDeleteConfirmationValue: 'preview',
          pendingDeleteDescription: 'Delete preview',
          pendingDeleteEntryNames: ['PREVIEW_TOKEN'],
          pendingDeleteTitle: 'Delete entry',
          requiresTypedDeleteConfirmation: true,
        }}
        variablesMessages={variablesMessages}
      />,
    )

    const dialogProps = capturedProps.mock.calls.at(-1)?.[0] as {
      actions: { onConfirm: () => void }
      state: {
        deleteConfirmationInputId: string
        pendingDeleteEntryNames: string[]
      }
    }

    expect(dialogProps.state).toEqual(
      expect.objectContaining({
        deleteConfirmationInputId: 'delete-confirmation-input',
        pendingDeleteEntryNames: ['PREVIEW_TOKEN'],
      }),
    )
    expect(dialogProps.actions.onConfirm).toBe(onConfirm)
  })
})

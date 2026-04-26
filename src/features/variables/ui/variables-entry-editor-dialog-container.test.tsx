// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesEntryEditorDialogContainer } from './variables-entry-editor-dialog-container'

const capturedProps = vi.fn()

vi.mock('./variables-entry-editor-dialog', () => ({
  VariablesEntryEditorDialog: (props: unknown) => {
    capturedProps(props)
    return <div data-testid="variables-entry-editor-dialog" />
  },
}))

describe('VariablesEntryEditorDialogContainer', () => {
  it('assembles content and state props for the entry editor dialog', () => {
    const variablesMessages = translations.en.variables
    const onApplyBulkEntries = vi.fn()

    render(
      <VariablesEntryEditorDialogContainer
        actions={{
          onApplyBulkEntries,
          onCancel: vi.fn(),
          onOpenChange: vi.fn(),
          onTabChange: vi.fn(),
        }}
        activeTab="single"
        bulkApplyLabel={variablesMessages.actions.add}
        bulkEntryPanel={<div>bulk panel</div>}
        canMutateEntryEditorScope
        entryEditorDescription="Edit a variable"
        entryEditorNeedsEnvironmentSelection={false}
        entryEditorRepository="acme/repo"
        entryEditorScope="repository-variables"
        entryEditorTitle="Edit variable"
        isBulkEditorActive={false}
        isBulkSaving={false}
        isSaving={false}
        isSingleEntryEditor
        open
        parsedBulkEntryCount={2}
        parsedBulkErrorCount={0}
        saveActionLabel={variablesMessages.actions.add}
        singleEntryForm={<form aria-label="single form" />}
        variablesMessages={variablesMessages}
      />,
    )

    const dialogProps = capturedProps.mock.calls.at(-1)?.[0] as {
      actions: { onApplyBulkEntries: () => void }
      content: { title: string; description: string }
      state: {
        entryEditorRepository: string
        entryEditorScope: string
        parsedBulkEntryCount: number
      }
    }

    expect(dialogProps.content).toEqual(
      expect.objectContaining({
        description: 'Edit a variable',
        title: 'Edit variable',
      }),
    )
    expect(dialogProps.state).toEqual(
      expect.objectContaining({
        entryEditorRepository: 'acme/repo',
        entryEditorScope: 'repository-variables',
        parsedBulkEntryCount: 2,
      }),
    )
    expect(dialogProps.actions.onApplyBulkEntries).toBe(onApplyBulkEntries)
  })
})

// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesEnvironmentCreateDialogContainer } from './variables-environment-create-dialog-container'

const capturedProps = vi.fn()

vi.mock('./variables-dialogs', () => ({
  VariablesEnvironmentCreateDialog: (props: unknown) => {
    capturedProps(props)
    return <div data-testid="variables-environment-create-dialog" />
  },
}))

describe('VariablesEnvironmentCreateDialogContainer', () => {
  it('assembles state and actions for the environment create dialog', () => {
    const variablesMessages = translations.en.variables
    const onSubmit = vi.fn()

    render(
      <VariablesEnvironmentCreateDialogContainer
        actions={{
          onClose: vi.fn(),
          onEnvironmentNameChange: vi.fn(),
          onOpenChange: vi.fn(),
          onSubmit,
        }}
        environmentName="preview"
        environmentNameError={null}
        environmentNameErrorId="environment-name-error"
        environmentNameInputId="environment-name-input"
        isCreatingEnvironment={false}
        isEnvironmentCreateOpen
        selectedRepository="acme/repo"
        variablesMessages={variablesMessages}
      />,
    )

    const dialogProps = capturedProps.mock.calls.at(-1)?.[0] as {
      actions: { onSubmit: () => void }
      state: {
        environmentName: string
        environmentNameInputId: string
        selectedRepository: string
      }
    }

    expect(dialogProps.state).toEqual(
      expect.objectContaining({
        environmentName: 'preview',
        environmentNameInputId: 'environment-name-input',
        selectedRepository: 'acme/repo',
      }),
    )
    expect(dialogProps.actions.onSubmit).toBe(onSubmit)
  })
})

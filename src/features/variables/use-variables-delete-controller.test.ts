import { describe, expect, it } from 'vitest'
import { translations } from '#/messages'
import {
  buildEntriesPendingDeleteRequest,
  buildEnvironmentPendingDeleteRequest,
  shouldClearPendingDeleteOnOpenChange,
} from './use-variables-delete-controller'

const variablesMessages = translations.en.variables

describe('buildEntriesPendingDeleteRequest', () => {
  it('requires an environment before deleting environment-scoped entries', () => {
    expect(
      buildEntriesPendingDeleteRequest({
        activeScope: 'environment-variables',
        entryNames: ['API_URL'],
        selectedEnvironment: '',
        selectedRepository: 'cheng/foo',
        variablesMessages,
      }),
    ).toEqual({
      environmentSelectionError:
        variablesMessages.validation.selectEnvironmentBeforeDeleting,
      pendingDelete: null,
    })
  })

  it('builds a pending entry delete request for the current target', () => {
    expect(
      buildEntriesPendingDeleteRequest({
        activeScope: 'repository-variables',
        entryNames: ['API_URL', 'LOG_LEVEL'],
        selectedEnvironment: '',
        selectedRepository: 'cheng/foo',
        variablesMessages,
      }),
    ).toEqual({
      environmentSelectionError: null,
      pendingDelete: {
        entryNames: ['API_URL', 'LOG_LEVEL'],
        environmentName: '',
        kind: 'entries',
        repository: 'cheng/foo',
        scope: 'repository-variables',
        targetLabel: 'cheng/foo',
      },
    })
  })
})

describe('buildEnvironmentPendingDeleteRequest', () => {
  it('requires both repository and environment selection', () => {
    expect(
      buildEnvironmentPendingDeleteRequest({
        selectedEnvironment: '',
        selectedRepository: 'cheng/foo',
        variablesMessages,
      }),
    ).toEqual({
      environmentSelectionError:
        variablesMessages.validation.selectEnvironmentBeforeDeleting,
      pendingDelete: null,
    })
  })

  it('builds a pending environment delete request', () => {
    expect(
      buildEnvironmentPendingDeleteRequest({
        selectedEnvironment: 'production',
        selectedRepository: 'cheng/foo',
        variablesMessages,
      }),
    ).toEqual({
      environmentSelectionError: null,
      pendingDelete: {
        environmentName: 'production',
        kind: 'environment',
        repository: 'cheng/foo',
      },
    })
  })
})

describe('shouldClearPendingDeleteOnOpenChange', () => {
  it('clears pending delete state only when the dialog closes while idle', () => {
    expect(
      shouldClearPendingDeleteOnOpenChange({
        isDeleteConfirming: false,
        open: false,
      }),
    ).toBe(true)

    expect(
      shouldClearPendingDeleteOnOpenChange({
        isDeleteConfirming: true,
        open: false,
      }),
    ).toBe(false)

    expect(
      shouldClearPendingDeleteOnOpenChange({
        isDeleteConfirming: false,
        open: true,
      }),
    ).toBe(false)
  })
})

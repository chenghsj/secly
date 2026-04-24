// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesTargetPanelContainer } from './variables-target-panel-container'

const capturedProps = vi.fn()

vi.mock('./variables-target-panel', () => ({
  VariablesTargetPanel: (props: unknown) => {
    capturedProps(props)
    return <div data-testid="variables-target-panel" />
  },
}))

describe('VariablesTargetPanelContainer', () => {
  it('builds repository and environment options before rendering the panel', () => {
    const variablesMessages = translations.en.variables
    const onRefresh = vi.fn()

    render(
      <VariablesTargetPanelContainer
        actions={{
          onDeleteEnvironment: vi.fn(),
          onDoneEnvironment: vi.fn(),
          onEnvironmentChange: vi.fn(),
          onOpenEnvironmentCreate: vi.fn(),
          onRefresh,
          onRepositoryChange: vi.fn(),
          onScopePrefetch: vi.fn(),
          onScopeChange: vi.fn(),
          onStartEnvironmentEditing: vi.fn(),
        }}
        activeScope="environment-variables"
        environmentSelectionError={null}
        environments={[
          {
            createdAt: '2025-01-01T00:00:00.000Z',
            htmlUrl: 'https://github.com/acme/repo/environments/production',
            name: 'production',
            protectionRulesCount: 0,
            updatedAt: '2025-01-01T00:00:00.000Z',
            variableCount: 3,
          },
          {
            createdAt: '2025-01-01T00:00:00.000Z',
            htmlUrl: 'https://github.com/acme/repo/environments/preview',
            name: 'preview',
            protectionRulesCount: 0,
            updatedAt: '2025-01-01T00:00:00.000Z',
            variableCount: 0,
          },
        ]}
        repositoryError={null}
        repositories={[
          {
            id: 1,
            name: 'repo',
            nameWithOwner: 'acme/repo',
            updatedAt: '2025-01-01T00:00:00.000Z',
            viewerPermission: 'ADMIN',
            visibility: 'private',
          },
        ]}
        selectedEnvironment="production"
        selectedRepository="acme/repo"
        status={{
          isDeletingEnvironment: false,
          isEnvironmentActionDisabled: false,
          isEnvironmentEditing: false,
          isRefreshingEnvironments: false,
          isRefreshingRepositories: false,
          isScopeChangeDisabled: false,
          isTargetRefreshing: false,
        }}
        variablesMessages={variablesMessages}
      />,
    )

    const panelProps = capturedProps.mock.calls.at(-1)?.[0] as {
      actions: { onRefresh: () => void }
      environment: { options: Array<{ label: string; value: string }> }
      repository: { options: string[] }
    }

    expect(panelProps.repository.options).toEqual(['acme/repo'])
    expect(panelProps.environment.options).toEqual([
      { label: 'production', value: 'production' },
      {
        label: `preview ${variablesMessages.environmentEmptyOptionLabel}`,
        value: 'preview',
      },
    ])
    expect(panelProps.actions.onRefresh).toBe(onRefresh)
  })
})

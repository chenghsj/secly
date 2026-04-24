// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  afterEach as afterEachTest,
  beforeEach as beforeEachTest,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { translations } from '#/messages'
import { VariablesTargetPanel } from './variables-target-panel'

const searchableSelectClickSpy = vi.fn()

function getSearchableSelectItemLabel(item: unknown) {
  if (typeof item === 'string') {
    return item
  }

  return typeof item === 'object' && item && 'label' in item
    ? String(item.label)
    : ''
}

function getSearchableSelectItemValue(item: unknown) {
  if (typeof item === 'string') {
    return item
  }

  return typeof item === 'object' && item && 'value' in item
    ? String(item.value)
    : ''
}

vi.mock('#/components/ui/searchable-select', () => ({
  SearchableSelect: ({
    ariaLabel,
    disabled = false,
    items = [],
  }: {
    ariaLabel: string
    disabled?: boolean
    items?: unknown[]
  }) => (
    <div>
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => searchableSelectClickSpy(ariaLabel)}
      >
        open
      </button>

      <div role="listbox" aria-label={`${ariaLabel} options`}>
        {items.map((item) => {
          const label = getSearchableSelectItemLabel(item)
          const value = getSearchableSelectItemValue(item)

          return (
            <button
              key={`${ariaLabel}-${value}`}
              type="button"
              role="option"
              aria-label={label}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  ),
}))

const variablesMessages = translations.en.variables

beforeEachTest(() => {
  searchableSelectClickSpy.mockReset()
})

afterEachTest(() => {
  cleanup()
})

function createProps() {
  return {
    actions: {
      onDeleteEnvironment: vi.fn(),
      onDoneEnvironment: vi.fn(),
      onEnvironmentChange: vi.fn(),
      onOpenEnvironmentCreate: vi.fn(),
      onRefresh: vi.fn(),
      onRepositoryChange: vi.fn(),
      onScopePrefetch: vi.fn(),
      onScopeChange: vi.fn(),
      onStartEnvironmentEditing: vi.fn(),
    },
    environment: {
      environments: [{ name: 'prod' }],
      error: null,
      options: [{ label: 'prod', value: 'prod' }],
      selected: 'prod',
    },
    repository: {
      error: null,
      options: ['acme/repo', 'acme/other'],
      repositories: [
        { canManageEnvironments: true, nameWithOwner: 'acme/repo' },
        { canManageEnvironments: true, nameWithOwner: 'acme/other' },
      ],
      selected: 'acme/repo',
    },
    scope: {
      activeScope: 'environment-secrets' as const,
    },
    status: {
      isDeletingEnvironment: false,
      isEnvironmentActionDisabled: false,
      isEnvironmentEditing: false,
      isRefreshingEnvironments: false,
      isRefreshingRepositories: false,
      isScopeChangeDisabled: false,
      isTargetRefreshing: false,
    },
    variablesMessages,
  }
}

describe('VariablesTargetPanel', () => {
  it('exposes the scope tabs as a labeled tablist with correctly named tabs', () => {
    render(<VariablesTargetPanel {...createProps()} />)

    expect(
      screen.getByRole('tablist', { name: variablesMessages.scopeLabel }),
    ).toBeDefined()
    expect(
      screen.getByRole('tab', {
        name: variablesMessages.scopes.repositoryVariables.tabLabel,
      }),
    ).toBeDefined()
    expect(
      screen
        .getByRole('tab', {
          name: variablesMessages.scopes.environmentSecrets.tabLabel,
        })
        .getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('does not open selectors when clicking the visible field labels', () => {
    render(<VariablesTargetPanel {...createProps()} />)

    fireEvent.click(screen.getAllByText(variablesMessages.repositoryLabel)[0])
    fireEvent.click(screen.getAllByText(variablesMessages.environmentLabel)[0])

    expect(searchableSelectClickSpy).not.toHaveBeenCalled()
  })

  it('shows add and edit actions together for environment controls by default', () => {
    render(<VariablesTargetPanel {...createProps()} />)

    expect(
      screen.getByRole('button', { name: variablesMessages.actions.add }),
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: variablesMessages.actions.edit }),
    ).toBeDefined()
  })

  it('disables environment actions and explains the permission requirement', () => {
    const props = createProps()
    props.repository.repositories = [
      { canManageEnvironments: false, nameWithOwner: 'acme/repo' },
      { canManageEnvironments: true, nameWithOwner: 'acme/other' },
    ]

    render(<VariablesTargetPanel {...props} />)

    expect(
      screen.getByRole('button', { name: variablesMessages.actions.add }),
    ).toHaveProperty('disabled', true)
    expect(
      screen.getByRole('button', { name: variablesMessages.actions.edit }),
    ).toHaveProperty('disabled', true)
    expect(
      screen.getByText(variablesMessages.environmentAdminAccessDescription),
    ).toBeDefined()
  })

  it('shows the environment admin access description only once when no environments exist', () => {
    const props = createProps()
    props.environment.environments = []
    props.environment.options = []
    props.environment.selected = ''
    props.repository.repositories = [
      { canManageEnvironments: false, nameWithOwner: 'acme/repo' },
      { canManageEnvironments: true, nameWithOwner: 'acme/other' },
    ]

    render(<VariablesTargetPanel {...props} />)

    expect(
      screen.getAllByText(variablesMessages.environmentAdminAccessDescription),
    ).toHaveLength(1)
  })

  it('shows add, delete, and done actions while editing environments', () => {
    const props = createProps()
    props.status.isEnvironmentEditing = true

    render(<VariablesTargetPanel {...props} />)

    expect(
      screen.getByRole('button', { name: variablesMessages.actions.add }),
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: variablesMessages.actions.delete }),
    ).toBeDefined()
    expect(
      screen.getByRole('button', { name: variablesMessages.actions.done }),
    ).toBeDefined()
    expect(
      screen.queryByRole('button', { name: variablesMessages.actions.edit }),
    ).toBeNull()
  })

  it('prefetches scope data when hovering an inactive scope tab', () => {
    const props = createProps()

    render(<VariablesTargetPanel {...props} />)

    fireEvent.mouseEnter(
      screen.getByRole('tab', {
        name: variablesMessages.scopes.repositoryVariables.tabLabel,
      }),
    )

    expect(props.actions.onScopePrefetch).toHaveBeenCalledWith(
      'repository-variables',
    )
  })

  it('prefetches scope data when focusing an inactive scope tab', () => {
    const props = createProps()

    render(<VariablesTargetPanel {...props} />)

    fireEvent.focus(
      screen.getByRole('tab', {
        name: variablesMessages.scopes.repositoryVariables.tabLabel,
      }),
    )

    expect(props.actions.onScopePrefetch).toHaveBeenCalledWith(
      'repository-variables',
    )
  })

  it('prefetches scope data on pointer down before switching tabs', () => {
    const props = createProps()

    render(<VariablesTargetPanel {...props} />)

    fireEvent.pointerDown(
      screen.getByRole('tab', {
        name: variablesMessages.scopes.repositoryVariables.tabLabel,
      }),
    )

    expect(props.actions.onScopePrefetch).toHaveBeenCalledWith(
      'repository-variables',
    )
  })

  it('keeps scope tabs interactive while the page is loading', () => {
    const props = createProps()

    render(<VariablesTargetPanel {...props} />)

    const tab = screen.getByRole('tab', {
      name: variablesMessages.scopes.repositoryVariables.tabLabel,
    })

    fireEvent.click(tab)
    fireEvent.focus(tab)
    fireEvent.mouseEnter(tab)
    fireEvent.pointerDown(tab)

    expect(props.actions.onScopeChange).toHaveBeenCalledWith(
      'repository-variables',
    )
    expect(props.actions.onScopePrefetch).toHaveBeenCalledWith(
      'repository-variables',
    )
  })

  it('keeps the environment selector enabled while environments refresh', () => {
    const props = createProps()
    props.status.isRefreshingEnvironments = true

    render(<VariablesTargetPanel {...props} />)

    expect(
      screen
        .getByRole('button', {
          name: variablesMessages.environmentLabel,
        })
        .hasAttribute('disabled'),
    ).toBe(false)
  })

  it('renders the pending environment target layout with skeletons instead of controls', () => {
    const props = createProps()
    props.status.isTargetRefreshing = true

    const { container } = render(<VariablesTargetPanel {...props} />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(11)
    expect(
      screen.queryByRole('button', { name: variablesMessages.actions.add }),
    ).toBeNull()
    expect(screen.queryByRole('combobox', { name: /repository/i })).toBeNull()
  })
})

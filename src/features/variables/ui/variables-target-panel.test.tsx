// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
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
    loading = false,
  }: {
    ariaLabel: string
    disabled?: boolean
    items?: unknown[]
    loading?: boolean
  }) => (
    <div>
      <button
        type="button"
        aria-label={ariaLabel}
        data-busy={loading ? 'true' : undefined}
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

function getScopeButton(groupTestId: string, name: string) {
  return within(screen.getByTestId(groupTestId)).getByRole('button', { name })
}

function getSelectButton(name: string) {
  return screen
    .getAllByRole('button', { name })
    .find((element) => !element.hasAttribute('aria-pressed'))
}

beforeEachTest(() => {
  searchableSelectClickSpy.mockReset()
})

afterEachTest(() => {
  cleanup()
})

function createProps(): Parameters<typeof VariablesTargetPanel>[0] {
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
  it('shows only the target-level scope toggle with the active selection', () => {
    render(<VariablesTargetPanel {...createProps()} />)

    const targetLevelGroup = screen.getByTestId('scope-target-level-group')

    expect(targetLevelGroup.getAttribute('aria-label')).toBe(
      variablesMessages.scopeTargetLabel,
    )
    expect(
      getScopeButton(
        'scope-target-level-group',
        variablesMessages.environmentLabel,
      ).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(screen.queryByText(variablesMessages.scopeTargetLabel)).toBeNull()
    expect(screen.queryByTestId('scope-setting-kind-group')).toBeNull()
  })

  it('does not render scope helper copy', () => {
    render(<VariablesTargetPanel {...createProps()} />)

    expect(
      screen.queryByText(
        variablesMessages.scopes.environmentSecrets.description,
      ),
    ).toBeNull()
  })

  it('does not open selectors when clicking the visible field labels', () => {
    render(<VariablesTargetPanel {...createProps()} />)

    fireEvent.click(screen.getAllByText(variablesMessages.repositoryLabel)[0])
    fireEvent.click(screen.getAllByText(variablesMessages.environmentLabel)[0])

    expect(searchableSelectClickSpy).not.toHaveBeenCalled()
  })

  it('shows repository selection before the scope switcher', () => {
    render(<VariablesTargetPanel {...createProps()} />)

    const repositorySelect = getSelectButton(variablesMessages.repositoryLabel)
    const scopeTargetGroup = screen.getByTestId('scope-target-level-group')

    expect(repositorySelect).toBeDefined()
    if (!repositorySelect) {
      throw new Error('Expected repository select button to exist')
    }
    expect(
      repositorySelect.compareDocumentPosition(scopeTargetGroup) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0)
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

  it('prefetches scope data when hovering an inactive target-level tab', () => {
    const props = createProps()

    render(<VariablesTargetPanel {...props} />)

    fireEvent.mouseEnter(
      getScopeButton(
        'scope-target-level-group',
        variablesMessages.repositoryLabel,
      ),
    )

    expect(props.actions.onScopePrefetch).toHaveBeenCalledWith(
      'repository-secrets',
    )
  })

  it('prefetches scope data on pointer down before switching target levels', () => {
    const props = createProps()

    render(<VariablesTargetPanel {...props} />)

    fireEvent.pointerDown(
      getScopeButton(
        'scope-target-level-group',
        variablesMessages.repositoryLabel,
      ),
    )

    expect(props.actions.onScopePrefetch).toHaveBeenCalledWith(
      'repository-secrets',
    )
  })

  it('keeps scope tabs interactive while the page is loading', () => {
    const props = createProps()

    render(<VariablesTargetPanel {...props} />)

    const tab = getScopeButton(
      'scope-target-level-group',
      variablesMessages.repositoryLabel,
    )

    fireEvent.click(tab)
    fireEvent.focus(tab)
    fireEvent.mouseEnter(tab)
    fireEvent.pointerDown(tab)

    expect(props.actions.onScopeChange).toHaveBeenCalledWith(
      'repository-secrets',
    )
    expect(props.actions.onScopePrefetch).toHaveBeenCalledWith(
      'repository-secrets',
    )
  })

  it('switches to environment scope when clicking the target-level environment toggle', () => {
    const props = createProps()
    props.scope.activeScope = 'repository-variables'

    render(<VariablesTargetPanel {...props} />)

    fireEvent.click(
      getScopeButton(
        'scope-target-level-group',
        variablesMessages.environmentLabel,
      ),
    )

    expect(props.actions.onScopeChange).toHaveBeenCalledWith(
      'environment-variables',
    )
  })

  it('keeps the environment selector enabled while environments refresh', () => {
    const props = createProps()
    props.status.isRefreshingEnvironments = true

    render(<VariablesTargetPanel {...props} />)

    expect(
      getSelectButton(variablesMessages.environmentLabel)?.hasAttribute(
        'disabled',
      ),
    ).toBe(false)
    expect(
      getSelectButton(variablesMessages.environmentLabel)?.getAttribute(
        'data-busy',
      ),
    ).toBe('true')
  })

  it('shows the environment selector as busy even when it has no options yet', () => {
    const props = createProps()
    props.environment.options = []
    props.status.isRefreshingEnvironments = true

    render(<VariablesTargetPanel {...props} />)

    const environmentButton = getSelectButton(
      variablesMessages.environmentLabel,
    )

    expect(environmentButton).toBeDefined()
    expect(environmentButton?.hasAttribute('disabled')).toBe(true)
    expect(environmentButton?.getAttribute('data-busy')).toBe('true')
  })

  it('does not show the no-environments empty state while environments refresh', () => {
    const props = createProps()
    props.environment.environments = []
    props.environment.options = []
    props.environment.selected = ''
    props.status.isRefreshingEnvironments = true

    render(<VariablesTargetPanel {...props} />)

    expect(screen.queryByText(variablesMessages.noEnvironmentsTitle)).toBeNull()
  })

  it('renders the pending environment target layout with skeletons instead of controls', () => {
    const props = createProps()
    props.status.isTargetRefreshing = true

    const { container } = render(<VariablesTargetPanel {...props} />)

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBe(9)
    expect(
      screen.queryByRole('button', { name: variablesMessages.actions.add }),
    ).toBeNull()
    expect(screen.queryByRole('combobox', { name: /repository/i })).toBeNull()
  })
})

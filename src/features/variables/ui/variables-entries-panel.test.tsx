// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach as afterEachTest, describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesEntriesPanel } from './variables-entries-panel'

const variablesMessages = translations.en.variables

afterEachTest(() => {
  cleanup()
})

function createProps() {
  return {
    actions: {
      onClearSearch: vi.fn(),
      onDeleteSelected: vi.fn(),
      onRequestDeleteEntry: vi.fn(),
      onSearchChange: vi.fn(),
      onSortChange: vi.fn(),
      onStartCreateEntry: vi.fn(),
      onStartEditEntry: vi.fn(),
      onToggleEntryEditing: vi.fn(),
      onToggleEntrySelection: vi.fn(),
      onToggleFilteredSelection: vi.fn(),
    },
    listState: {
      canMutateCurrentScope: true,
      currentEntries: [
        {
          createdAt: '2026-04-19T00:00:00Z',
          name: 'API_URL',
          updatedAt: '2026-04-20T00:00:00Z',
          value: 'https://example.com',
        },
      ],
      entrySortDirection: 'asc' as const,
      entrySortField: 'name' as const,
      filteredEntries: [
        {
          createdAt: '2026-04-19T00:00:00Z',
          name: 'API_URL',
          updatedAt: '2026-04-20T00:00:00Z',
          value: 'https://example.com',
        },
      ],
      hasLoadedCurrentEntries: true,
      isListActionDisabled: false,
      isListLoading: false,
      isTableEditing: false,
      listEmptyDescription: variablesMessages.noEntriesDescription,
      listEmptyTitle: variablesMessages.noEntriesTitle,
      noMatchesTitle: variablesMessages.noMatchesTitle,
      sortedFilteredEntries: [
        {
          createdAt: '2026-04-19T00:00:00Z',
          name: 'API_URL',
          updatedAt: '2026-04-20T00:00:00Z',
          value: 'https://example.com',
        },
      ],
    },
    locale: 'en' as const,
    scope: {
      activeScope: 'repository-variables' as const,
      scopeConfig: variablesMessages.scopes.repositoryVariables,
      valueColumnLabel: variablesMessages.columns.value,
    },
    search: {
      inputId: 'entry-search-input',
      query: '',
    },
    selection: {
      allFilteredEntriesSelected: false,
      hasPartiallySelectedEntries: false,
      hasSelectedEntries: false,
      selectedEntryNameSet: new Set<string>(),
    },
    target: {
      environments: [],
      environmentsRepository: 'acme/repo',
      selectedEnvironment: '',
      selectedRepository: 'acme/repo',
    },
    variablesMessages,
  }
}

describe('VariablesEntriesPanel', () => {
  it('shows a lightweight busy state instead of table skeletons before current entries load', () => {
    const props = createProps()
    props.listState.currentEntries = []
    props.listState.filteredEntries = []
    props.listState.sortedFilteredEntries = []
    props.listState.hasLoadedCurrentEntries = false
    props.listState.isListLoading = true

    const { container } = render(<VariablesEntriesPanel {...props} />)

    expect(
      screen.getByText(variablesMessages.pending.listRefreshingLabel),
    ).toBeDefined()
    expect(screen.queryByRole('table')).toBeNull()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
  })

  it('keeps the loaded table visible while showing a compact refresh notice', () => {
    const props = createProps()
    props.listState.isListLoading = true

    const { container } = render(<VariablesEntriesPanel {...props} />)

    expect(screen.getByText('API_URL')).toBeDefined()
    expect(
      screen.getByText(variablesMessages.pending.listRefreshingLabel),
    ).toBeDefined()
    expect(screen.getByRole('table')).toBeDefined()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull()
  })
})

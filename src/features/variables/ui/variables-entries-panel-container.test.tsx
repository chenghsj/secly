// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { translations } from '#/messages'
import { VariablesEntriesPanelContainer } from './variables-entries-panel-container'

const capturedProps = vi.fn()

vi.mock('./variables-entries-panel', () => ({
  VariablesEntriesPanel: (props: unknown) => {
    capturedProps(props)
    return <div data-testid="variables-entries-panel" />
  },
}))

describe('VariablesEntriesPanelContainer', () => {
  it('groups list, scope, search, selection, and target props before rendering the panel', () => {
    const variablesMessages = translations.en.variables
    const onStartCreateEntry = vi.fn()

    render(
      <VariablesEntriesPanelContainer
        actions={{
          onClearSearch: vi.fn(),
          onDeleteSelected: vi.fn(),
          onRequestDeleteEntry: vi.fn(),
          onSearchChange: vi.fn(),
          onScopeChange: vi.fn(),
          onScopePrefetch: vi.fn(),
          onSortChange: vi.fn(),
          onStartCreateEntry,
          onStartEditEntry: vi.fn(),
          onToggleEntryEditing: vi.fn(),
          onToggleEntrySelection: vi.fn(),
          onToggleFilteredSelection: vi.fn(),
        }}
        activeScope="repository-variables"
        allFilteredEntriesSelected={false}
        canMutateCurrentScope
        currentEntries={[
          {
            createdAt: '2026-04-19T00:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-20T00:00:00Z',
            value: 'https://example.com',
          },
        ]}
        entrySortDirection="asc"
        entrySortField="name"
        environments={[]}
        environmentsRepository="acme/repo"
        filteredEntries={[
          {
            createdAt: '2026-04-19T00:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-20T00:00:00Z',
            value: 'https://example.com',
          },
        ]}
        hasLoadedCurrentEntries
        hasPartiallySelectedEntries={false}
        hasSelectedEntries={false}
        inputId="entry-search-input"
        isListActionDisabled={false}
        isListLoading={false}
        isTableEditing={false}
        listEmptyDescription={variablesMessages.noEntriesDescription}
        listEmptyTitle={variablesMessages.noEntriesTitle}
        locale="en"
        noMatchesTitle={variablesMessages.noMatchesTitle}
        query="api"
        scopeConfig={variablesMessages.scopes.repositoryVariables}
        selectedEntryNameSet={new Set<string>()}
        selectedEnvironment=""
        selectedRepository="acme/repo"
        sortedFilteredEntries={[
          {
            createdAt: '2026-04-19T00:00:00Z',
            name: 'API_URL',
            updatedAt: '2026-04-20T00:00:00Z',
            value: 'https://example.com',
          },
        ]}
        valueColumnLabel={variablesMessages.columns.value}
        variablesMessages={variablesMessages}
      />,
    )

    const panelProps = capturedProps.mock.calls.at(-1)?.[0] as {
      actions: { onStartCreateEntry: () => void }
      listState: { currentEntries: Array<{ name: string }> }
      search: { inputId: string; query: string }
      scope: { activeScope: string; valueColumnLabel: string }
      target: { selectedRepository: string }
    }

    expect(panelProps.listState.currentEntries).toHaveLength(1)
    expect(panelProps.search).toEqual({
      inputId: 'entry-search-input',
      query: 'api',
    })
    expect(panelProps.scope).toEqual({
      activeScope: 'repository-variables',
      scopeConfig: variablesMessages.scopes.repositoryVariables,
      valueColumnLabel: variablesMessages.columns.value,
    })
    expect(panelProps.target.selectedRepository).toBe('acme/repo')
    expect(panelProps.actions.onStartCreateEntry).toBe(onStartCreateEntry)
  })
})

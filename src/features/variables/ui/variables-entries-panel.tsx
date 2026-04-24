import { PencilLineIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import type {
  SettingsScope,
  VariablesEntrySortDirection,
  VariablesEntrySortField,
} from '#/lib/variables-route-search'
import type { AppLocale } from '#/messages'
import type {
  SettingsEntry,
  VariablesMessages,
} from '#/features/variables/domain/variables-types'
import {
  formatDateTime,
  formatMessage,
  isEnvironmentScope,
  isSecretScope,
} from '#/features/variables/models/variables-helpers'
import {
  InlineBusyState,
  SortableTableHead,
  TableSelectionCheckbox,
} from './variables-shared'

type ScopeConfig =
  VariablesMessages['scopes'][keyof VariablesMessages['scopes']]

type VariablesEntriesPanelScopeProps = {
  activeScope: SettingsScope
  scopeConfig: ScopeConfig
  valueColumnLabel: string
}

type VariablesEntriesPanelTargetProps = {
  environments: Array<{ name: string }>
  environmentsRepository: string
  selectedEnvironment: string
  selectedRepository: string
}

type VariablesEntriesPanelSelectionProps = {
  allFilteredEntriesSelected: boolean
  hasPartiallySelectedEntries: boolean
  hasSelectedEntries: boolean
  selectedEntryNameSet: Set<string>
}

type VariablesEntriesPanelSearchProps = {
  inputId: string
  query: string
}

type VariablesEntriesPanelListStateProps = {
  canMutateCurrentScope: boolean
  currentEntries: SettingsEntry[]
  entrySortDirection: VariablesEntrySortDirection
  entrySortField: VariablesEntrySortField
  filteredEntries: SettingsEntry[]
  hasLoadedCurrentEntries: boolean
  isListActionDisabled: boolean
  isListLoading: boolean
  isTableEditing: boolean
  listEmptyDescription: string
  listEmptyTitle: string
  noMatchesTitle: string
  sortedFilteredEntries: SettingsEntry[]
}

type VariablesEntriesPanelActionsProps = {
  onClearSearch: () => void
  onDeleteSelected: () => void
  onRequestDeleteEntry: (entryName: string) => void
  onSearchChange: (value: string) => void
  onSortChange: (field: VariablesEntrySortField) => void
  onStartCreateEntry: () => void
  onStartEditEntry: (entry: SettingsEntry) => void
  onToggleEntryEditing: (value: boolean) => void
  onToggleEntrySelection: (entryName: string) => void
  onToggleFilteredSelection: () => void
}

export type VariablesEntriesPanelProps = {
  scope: VariablesEntriesPanelScopeProps
  target: VariablesEntriesPanelTargetProps
  selection: VariablesEntriesPanelSelectionProps
  search: VariablesEntriesPanelSearchProps
  listState: VariablesEntriesPanelListStateProps
  actions: VariablesEntriesPanelActionsProps
  locale: AppLocale
  variablesMessages: VariablesMessages
}

export function VariablesEntriesPanel({
  scope,
  target,
  selection,
  search,
  listState,
  actions,
  locale,
  variablesMessages,
}: VariablesEntriesPanelProps) {
  const showInlineBusyState =
    listState.isListLoading && !listState.hasLoadedCurrentEntries
  const showRefreshNotice =
    listState.isListLoading && listState.hasLoadedCurrentEntries

  return (
    <Card>
      <CardHeader>
        <CardTitle>{scope.scopeConfig.title}</CardTitle>
        <CardDescription>{scope.scopeConfig.listDescription}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-1">
            <Input
              id={search.inputId}
              name="entry_search"
              aria-label={scope.scopeConfig.searchPlaceholder}
              autoComplete="off"
              className="sm:flex-1"
              value={search.query}
              placeholder={scope.scopeConfig.searchPlaceholder}
              onChange={(event) => actions.onSearchChange(event.target.value)}
            />

            {search.query ? (
              <Button
                variant="outline"
                type="button"
                disabled={listState.isListActionDisabled}
                onClick={actions.onClearSearch}
              >
                {variablesMessages.clearSearchButton}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={
                !listState.canMutateCurrentScope ||
                listState.isListActionDisabled
              }
              onClick={actions.onStartCreateEntry}
            >
              <PlusIcon data-icon="inline-start" />
              {variablesMessages.actions.add}
            </Button>

            {listState.isTableEditing ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    !selection.hasSelectedEntries ||
                    listState.isListActionDisabled
                  }
                  onClick={actions.onDeleteSelected}
                >
                  {variablesMessages.actions.delete}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={listState.isListActionDisabled}
                  onClick={() => actions.onToggleEntryEditing(false)}
                >
                  {variablesMessages.actions.done}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={
                  !listState.canMutateCurrentScope ||
                  listState.isListActionDisabled
                }
                onClick={() => actions.onToggleEntryEditing(true)}
              >
                <PencilLineIcon data-icon="inline-start" />
                {variablesMessages.actions.edit}
              </Button>
            )}
          </div>
        </div>

        {showRefreshNotice ? (
          <InlineBusyState
            label={variablesMessages.pending.listRefreshingLabel}
            className="self-start border-none bg-transparent px-0 py-0 text-xs"
          />
        ) : null}

        {showInlineBusyState ? (
          <InlineBusyState
            label={variablesMessages.pending.listRefreshingLabel}
          />
        ) : !target.selectedRepository ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{variablesMessages.selectRepositoryTitle}</EmptyTitle>
              <EmptyDescription>
                {variablesMessages.selectRepositoryDescription}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : isEnvironmentScope(scope.activeScope) &&
          target.environmentsRepository === target.selectedRepository &&
          target.environments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{variablesMessages.noEnvironmentsTitle}</EmptyTitle>
              <EmptyDescription>
                {formatMessage(variablesMessages.noEnvironmentsDescription, {
                  repository: target.selectedRepository,
                })}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : isEnvironmentScope(scope.activeScope) &&
          !target.selectedEnvironment ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                {variablesMessages.selectEnvironmentTitle}
              </EmptyTitle>
              <EmptyDescription>
                {variablesMessages.selectEnvironmentDescription}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : listState.hasLoadedCurrentEntries &&
          listState.currentEntries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{listState.listEmptyTitle}</EmptyTitle>
              <EmptyDescription>
                {listState.listEmptyDescription}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={actions.onStartCreateEntry}>
                {formatMessage(variablesMessages.actions.createFirstEntry, {
                  entry: scope.scopeConfig.entryLabel,
                })}
              </Button>
            </EmptyContent>
          </Empty>
        ) : listState.filteredEntries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{listState.noMatchesTitle}</EmptyTitle>
              <EmptyDescription>
                {variablesMessages.noMatchesDescription}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={actions.onClearSearch}>
                {variablesMessages.clearSearchButton}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  {listState.isTableEditing ? (
                    <TableHead className="w-12">
                      <TableSelectionCheckbox
                        aria-label={variablesMessages.actions.selectAll}
                        checked={selection.allFilteredEntriesSelected}
                        indeterminate={selection.hasPartiallySelectedEntries}
                        onChange={actions.onToggleFilteredSelection}
                      />
                    </TableHead>
                  ) : null}
                  <SortableTableHead
                    activeDirection={listState.entrySortDirection}
                    activeField={listState.entrySortField}
                    field="name"
                    label={variablesMessages.columns.name}
                    onClick={actions.onSortChange}
                    sortByColumnLabel={variablesMessages.sorting.sortByColumn}
                  />
                  <SortableTableHead
                    activeDirection={listState.entrySortDirection}
                    activeField={listState.entrySortField}
                    field="value"
                    label={scope.valueColumnLabel}
                    onClick={actions.onSortChange}
                    sortByColumnLabel={variablesMessages.sorting.sortByColumn}
                  />
                  <SortableTableHead
                    activeDirection={listState.entrySortDirection}
                    activeField={listState.entrySortField}
                    field="updated"
                    label={variablesMessages.columns.updated}
                    onClick={actions.onSortChange}
                    sortByColumnLabel={variablesMessages.sorting.sortByColumn}
                  />
                  {!listState.isTableEditing ? (
                    <TableHead className="sticky right-0 z-20 w-24 bg-card text-right">
                      {variablesMessages.columns.actions}
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {listState.sortedFilteredEntries.map((entry) => (
                  <TableRow key={entry.name}>
                    {listState.isTableEditing ? (
                      <TableCell className="w-12">
                        <TableSelectionCheckbox
                          aria-label={formatMessage(
                            variablesMessages.actions.selectEntry,
                            {
                              name: entry.name,
                            },
                          )}
                          checked={selection.selectedEntryNameSet.has(
                            entry.name,
                          )}
                          onChange={() =>
                            actions.onToggleEntrySelection(entry.name)
                          }
                        />
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <code>{entry.name}</code>
                    </TableCell>
                    <TableCell className="max-w-[20rem] truncate text-muted-foreground">
                      {isSecretScope(scope.activeScope)
                        ? entry.visibility
                          ? formatMessage(
                              variablesMessages.states
                                .secretStoredWithVisibility,
                              {
                                visibility: entry.visibility,
                              },
                            )
                          : variablesMessages.states.secretStored
                        : entry.value}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(entry.updatedAt, locale)}
                    </TableCell>
                    {!listState.isTableEditing ? (
                      <TableCell className="sticky right-0 z-10 w-24 bg-card">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`${variablesMessages.actions.edit} ${entry.name}`}
                            title={`${variablesMessages.actions.edit} ${entry.name}`}
                            onClick={() => actions.onStartEditEntry(entry)}
                          >
                            <PencilLineIcon />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`${variablesMessages.actions.delete} ${entry.name}`}
                            title={`${variablesMessages.actions.delete} ${entry.name}`}
                            onClick={() =>
                              actions.onRequestDeleteEntry(entry.name)
                            }
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  Loader2Icon,
  PencilLineIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
  Trash2Icon,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import {
  SearchableSelect,
  type SearchableSelectItem,
} from '#/components/ui/searchable-select'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Textarea } from '#/components/ui/textarea'
import type {
  EditorTab,
  SettingsScope,
  VariablesEntrySortDirection,
  VariablesEntrySortField,
} from '#/lib/variables-route-search'
import type { AppLocale } from '#/messages'
import type {
  GlobalSearchResult,
  PendingDeleteState,
  SettingsEntry,
  VariablesMessages,
} from './variables-types'
import {
  formatDateTime,
  formatMessage,
  getScopeConfig,
  isEnvironmentScope,
  isSecretScope,
} from './variables-selectors'

type ScopeConfig =
  VariablesMessages['scopes'][keyof VariablesMessages['scopes']]

type VariablesTargetPanelScopeProps = {
  activeScope: SettingsScope
}

type VariablesTargetPanelRepositoryProps = {
  options: string[]
  repositories: Array<{ nameWithOwner: string }>
  selected: string
  error: string | null
}

type VariablesTargetPanelEnvironmentProps = {
  environments: Array<{ name: string }>
  options: SearchableSelectItem[]
  selected: string
  error: string | null
}

type VariablesTargetPanelStatusProps = {
  isDeletingEnvironment: boolean
  isEnvironmentActionDisabled: boolean
  isEnvironmentEditing: boolean
  isRefreshingEnvironments: boolean
  isRefreshingRepositories: boolean
  isTargetRefreshing: boolean
}

type VariablesTargetPanelActionsProps = {
  onDeleteEnvironment: () => void
  onDoneEnvironment: () => void
  onEnvironmentChange: (nextEnvironment: string) => void
  onOpenEnvironmentCreate: () => void
  onRefresh: () => void
  onRepositoryChange: (nextRepository: string) => void
  onStartEnvironmentEditing: () => void
}

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

type VariablesEntryEditorDialogStateProps = {
  activeTab: EditorTab
  canMutateEntryEditorScope: boolean
  entryEditorNeedsEnvironmentSelection: boolean
  entryEditorRepository: string
  entryEditorScope: SettingsScope
  isBulkEditorActive: boolean
  isBulkSaving: boolean
  isSaving: boolean
  isSingleEntryEditor: boolean
  open: boolean
  parsedBulkErrorCount: number
  parsedBulkEntryCount: number
}

type VariablesEntryEditorDialogActionsProps = {
  onApplyBulkEntries: () => void
  onCancel: () => void
  onOpenChange: (open: boolean, details: { reason: string }) => void
  onTabChange: (tab: EditorTab) => void
}

type VariablesEntryEditorDialogContentProps = {
  bulkApplyLabel: string
  bulkEntryPanel: ReactNode
  description: string
  saveActionLabel: string
  singleEntryForm: ReactNode
  title: string
}

type VariablesDeleteConfirmDialogStateProps = {
  deleteConfirmationInputId: string
  deleteConfirmationValue: string
  isDeleteConfirming: boolean
  isTypedDeleteConfirmationMatched: boolean
  pendingDelete: PendingDeleteState | null
  pendingDeleteActionLabel: string
  pendingDeleteConfirmationValue: string
  pendingDeleteDescription: string
  pendingDeleteEntryNames: string[]
  pendingDeleteTitle: string
  requiresTypedDeleteConfirmation: boolean
}

type VariablesDeleteConfirmDialogActionsProps = {
  onConfirm: () => void
  onConfirmationValueChange: (value: string) => void
  onCopyConfirmationValue: () => void
  onOpenChange: (open: boolean) => void
}

type VariablesGlobalSearchDialogStateProps = {
  filteredResults: GlobalSearchResult[]
  globalSearchError: string | null
  globalSearchInputId: string
  globalSearchQuery: string
  isGlobalSearchDialogOpen: boolean
  isGlobalSearchLoading: boolean
  selectedRepository: string
  trimmedGlobalSearchQuery: string
}

type VariablesGlobalSearchDialogActionsProps = {
  onClearSearch: () => void
  onGlobalSearchQueryChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onOpenResult: (result: GlobalSearchResult) => void
  onRetry: () => void
}

type VariablesGlobalSearchDialogContentProps = {
  locale: AppLocale
}

type VariablesEnvironmentCreateDialogStateProps = {
  environmentName: string
  environmentNameError: string | null
  environmentNameErrorId: string
  environmentNameInputId: string
  isCreatingEnvironment: boolean
  isEnvironmentCreateOpen: boolean
  selectedRepository: string
}

type VariablesEnvironmentCreateDialogActionsProps = {
  onClose: () => void
  onEnvironmentNameChange: (value: string) => void
  onOpenChange: (open: boolean, details: { reason: string }) => void
  onSubmit: () => void
}

type VariablesEntryEditorDialogContextValue = {
  actions: VariablesEntryEditorDialogActionsProps
  content: VariablesEntryEditorDialogContentProps
  state: VariablesEntryEditorDialogStateProps
  variablesMessages: VariablesMessages
}

const VariablesEntryEditorDialogContext =
  createContext<VariablesEntryEditorDialogContextValue | null>(null)

function ButtonLoadingIcon() {
  return <Loader2Icon data-icon="inline-start" className="animate-spin" />
}

function useVariablesEntryEditorDialogContext() {
  const context = useContext(VariablesEntryEditorDialogContext)

  if (!context) {
    throw new Error(
      'VariablesEntryEditorDialog subcomponents must be used within VariablesEntryEditorDialog.',
    )
  }

  return context
}

export function VariablesTargetPanel({
  scope,
  repository,
  environment,
  status,
  actions,
  variablesMessages,
}: {
  scope: VariablesTargetPanelScopeProps
  repository: VariablesTargetPanelRepositoryProps
  environment: VariablesTargetPanelEnvironmentProps
  status: VariablesTargetPanelStatusProps
  actions: VariablesTargetPanelActionsProps
  variablesMessages: VariablesMessages
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{variablesMessages.targetTitle}</CardTitle>
        <CardDescription>
          {isEnvironmentScope(scope.activeScope)
            ? variablesMessages.targetDescriptionEnvironment
            : variablesMessages.targetDescriptionRepository}
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            disabled={status.isTargetRefreshing}
            onClick={actions.onRefresh}
          >
            <RefreshCwIcon
              data-icon="inline-start"
              className={status.isTargetRefreshing ? 'animate-spin' : undefined}
            />
            {variablesMessages.refreshButton}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {status.isTargetRefreshing ? (
          <VariablesTargetFieldsSkeleton
            showsEnvironmentTarget={isEnvironmentScope(scope.activeScope)}
          />
        ) : repository.repositories.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{variablesMessages.noRepositoriesTitle}</EmptyTitle>
              <EmptyDescription>
                {variablesMessages.noRepositoriesDescription}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <Field label={variablesMessages.repositoryLabel}>
              <SearchableSelect
                ariaLabel={variablesMessages.repositoryLabel}
                className="w-full"
                disabled={status.isRefreshingRepositories}
                emptyMessage={variablesMessages.selectionSearchEmpty}
                items={repository.options}
                placeholder={variablesMessages.repositoryLabel}
                searchPlaceholder={
                  variablesMessages.repositorySearchPlaceholder
                }
                value={repository.selected}
                onValueChange={actions.onRepositoryChange}
              />
              <FieldError message={repository.error} />
            </Field>

            {isEnvironmentScope(scope.activeScope) ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <Field label={variablesMessages.environmentLabel}>
                      <SearchableSelect
                        ariaLabel={variablesMessages.environmentLabel}
                        className="w-full"
                        disabled={
                          !environment.options.length ||
                          status.isRefreshingEnvironments
                        }
                        emptyMessage={variablesMessages.selectionSearchEmpty}
                        items={environment.options}
                        placeholder={variablesMessages.environmentLabel}
                        searchPlaceholder={
                          variablesMessages.environmentSearchPlaceholder
                        }
                        value={environment.selected}
                        onValueChange={actions.onEnvironmentChange}
                      />
                      <FieldError message={environment.error} />
                    </Field>
                  </div>

                  <div className="flex items-end lg:justify-end">
                    <div className="flex flex-wrap gap-2">
                      {status.isEnvironmentEditing ? (
                        <>
                          <Button
                            type="button"
                            disabled={
                              !repository.selected ||
                              status.isEnvironmentActionDisabled
                            }
                            onClick={actions.onOpenEnvironmentCreate}
                          >
                            <PlusIcon data-icon="inline-start" />
                            {variablesMessages.actions.add}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={
                              !environment.selected ||
                              status.isDeletingEnvironment ||
                              status.isEnvironmentActionDisabled
                            }
                            onClick={actions.onDeleteEnvironment}
                          >
                            {status.isDeletingEnvironment ? (
                              <ButtonLoadingIcon />
                            ) : null}
                            {variablesMessages.actions.delete}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={status.isEnvironmentActionDisabled}
                            onClick={actions.onDoneEnvironment}
                          >
                            {variablesMessages.actions.done}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            !repository.selected ||
                            status.isEnvironmentActionDisabled
                          }
                          onClick={actions.onStartEnvironmentEditing}
                        >
                          <PencilLineIcon data-icon="inline-start" />
                          {variablesMessages.actions.edit}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {environment.environments.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>
                        {variablesMessages.noEnvironmentsTitle}
                      </EmptyTitle>
                      <EmptyDescription>
                        {formatMessage(
                          variablesMessages.noEnvironmentsDescription,
                          {
                            repository: repository.selected,
                          },
                        )}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
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
}: {
  scope: VariablesEntriesPanelScopeProps
  target: VariablesEntriesPanelTargetProps
  selection: VariablesEntriesPanelSelectionProps
  search: VariablesEntriesPanelSearchProps
  listState: VariablesEntriesPanelListStateProps
  actions: VariablesEntriesPanelActionsProps
  locale: AppLocale
  variablesMessages: VariablesMessages
}) {
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

        {listState.isListLoading ? (
          <LoadingTable />
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
                  <TableHead className="w-24 text-right">
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
                        checked={selection.selectedEntryNameSet.has(entry.name)}
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
                            variablesMessages.states.secretStoredWithVisibility,
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
                    <TableCell>
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
        )}
      </CardContent>
    </Card>
  )
}

export function VariablesEntryEditorDialog({
  actions,
  content,
  state,
  variablesMessages,
}: {
  actions: VariablesEntryEditorDialogActionsProps
  content: VariablesEntryEditorDialogContentProps
  state: VariablesEntryEditorDialogStateProps
  variablesMessages: VariablesMessages
}) {
  return (
    <VariablesEntryEditorDialogContext.Provider
      value={{ actions, content, state, variablesMessages }}
    >
      <Dialog
        open={state.open}
        disablePointerDismissal
        onOpenChange={actions.onOpenChange}
      >
        <DialogContent className="w-[min(calc(100vw-1.5rem),38rem)] p-0">
          <DialogHeader>
            <DialogTitle>{content.title}</DialogTitle>
            <DialogDescription>{content.description}</DialogDescription>
          </DialogHeader>

          <VariablesEntryEditorDialogBody />
          <VariablesEntryEditorDialogFooter />
        </DialogContent>
      </Dialog>
    </VariablesEntryEditorDialogContext.Provider>
  )
}

function VariablesEntryEditorDialogBody() {
  const { actions, content, state, variablesMessages } =
    useVariablesEntryEditorDialogContext()

  return (
    <DialogBody className="flex flex-col gap-4">
      {!state.entryEditorRepository ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {variablesMessages.editorSelectRepositoryTitle}
            </EmptyTitle>
            <EmptyDescription>
              {variablesMessages.editorSelectRepositoryDescription}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : state.entryEditorNeedsEnvironmentSelection ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {variablesMessages.editorSelectEnvironmentTitle}
            </EmptyTitle>
            <EmptyDescription>
              {variablesMessages.editorSelectEnvironmentDescription}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {isSecretScope(state.entryEditorScope) ? (
            <Alert>
              <ShieldAlertIcon />
              <AlertTitle>{variablesMessages.noteSecretTitle}</AlertTitle>
              <AlertDescription>
                {variablesMessages.noteSecretDescription}
              </AlertDescription>
            </Alert>
          ) : null}

          {state.isSingleEntryEditor ? (
            content.singleEntryForm
          ) : (
            <Tabs
              value={state.activeTab}
              onValueChange={(tab) => actions.onTabChange(tab as EditorTab)}
            >
              <TabsList className="w-full">
                <TabsTrigger value="single">
                  {variablesMessages.quickEditTab}
                </TabsTrigger>
                <TabsTrigger value="bulk">
                  {variablesMessages.bulkPasteTab}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single">
                {content.singleEntryForm}
              </TabsContent>
              <TabsContent value="bulk">{content.bulkEntryPanel}</TabsContent>
            </Tabs>
          )}
        </>
      )}
    </DialogBody>
  )
}

function VariablesEntryEditorDialogFooter() {
  const { actions, content, state, variablesMessages } =
    useVariablesEntryEditorDialogContext()

  return (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={actions.onCancel}>
        {variablesMessages.deleteDialogCancel}
      </Button>
      {state.entryEditorRepository &&
      !state.entryEditorNeedsEnvironmentSelection ? (
        !state.isBulkEditorActive ? (
          <Button
            type="submit"
            form="single-entry-form"
            disabled={state.isSaving || !state.canMutateEntryEditorScope}
          >
            {state.isSaving ? <ButtonLoadingIcon /> : null}
            {content.saveActionLabel}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={
              state.isBulkSaving ||
              !state.canMutateEntryEditorScope ||
              state.parsedBulkEntryCount === 0 ||
              state.parsedBulkErrorCount > 0
            }
            onClick={actions.onApplyBulkEntries}
          >
            {state.isBulkSaving ? <ButtonLoadingIcon /> : null}
            {content.bulkApplyLabel}
          </Button>
        )
      ) : null}
    </DialogFooter>
  )
}

export function VariablesSingleEntryForm({
  editingEntryName,
  entryEditorScope,
  entryNameErrorId,
  entryNameLabel,
  entryNameInputId,
  entryValueErrorId,
  entryValueInputId,
  entryValueLabel,
  isSaving,
  name,
  nameError,
  onNameChange,
  onSubmit,
  onValueChange,
  value,
  valueError,
  valuePlaceholder,
  variablesMessages,
}: {
  editingEntryName: string | null
  entryEditorScope: SettingsScope
  entryNameErrorId: string
  entryNameInputId: string
  entryNameLabel: string
  entryValueErrorId: string
  entryValueInputId: string
  entryValueLabel: string
  isSaving: boolean
  name: string
  nameError: string | null
  onNameChange: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onValueChange: (value: string) => void
  value: string
  valueError: string | null
  valuePlaceholder: string
  variablesMessages: VariablesMessages
}) {
  return (
    <form
      id="single-entry-form"
      className="flex flex-col gap-4"
      onSubmit={onSubmit}
    >
      <Field label={entryNameLabel}>
        <Input
          id={entryNameInputId}
          name="entry_name"
          aria-describedby={nameError ? entryNameErrorId : undefined}
          aria-invalid={Boolean(nameError)}
          autoComplete="off"
          disabled={Boolean(editingEntryName) || isSaving}
          placeholder={
            isSecretScope(entryEditorScope) ? 'API_KEY' : 'API_BASE_URL'
          }
          spellCheck={false}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
        <FieldError id={entryNameErrorId} message={nameError} />
      </Field>

      <Field label={entryValueLabel}>
        <Textarea
          id={entryValueInputId}
          name="entry_value"
          aria-describedby={valueError ? entryValueErrorId : undefined}
          aria-invalid={Boolean(valueError)}
          disabled={isSaving}
          placeholder={valuePlaceholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <FieldError id={entryValueErrorId} message={valueError} />
      </Field>

      {isSecretScope(entryEditorScope) && editingEntryName ? (
        <Alert>
          <ShieldAlertIcon />
          <AlertTitle>{variablesMessages.noteSecretEditTitle}</AlertTitle>
          <AlertDescription>
            {variablesMessages.noteSecretEditDescription}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

export function VariablesBulkEntryPanel({
  bulkInput,
  bulkInputError,
  bulkInputErrorId,
  bulkInputErrorListId,
  bulkInputId,
  duplicateSummary,
  isBulkSaving,
  onBulkInputChange,
  parsedBulkEntries,
  parsedBulkErrors,
  previewSummary,
  valuePlaceholder,
  variablesMessages,
}: {
  bulkInput: string
  bulkInputError: string | null
  bulkInputErrorId: string
  bulkInputErrorListId: string
  bulkInputId: string
  duplicateSummary: string
  isBulkSaving: boolean
  onBulkInputChange: (value: string) => void
  parsedBulkEntries: Array<{ name: string }>
  parsedBulkErrors: string[]
  previewSummary: string
  valuePlaceholder: string
  variablesMessages: VariablesMessages
}) {
  return (
    <div className="flex flex-col gap-4">
      <Field label={variablesMessages.bulkFieldLabel}>
        <Textarea
          id={bulkInputId}
          name="bulk_entries"
          aria-describedby={
            bulkInputError && parsedBulkErrors.length > 0
              ? `${bulkInputErrorId} ${bulkInputErrorListId}`
              : bulkInputError
                ? bulkInputErrorId
                : parsedBulkErrors.length > 0
                  ? bulkInputErrorListId
                  : undefined
          }
          aria-invalid={Boolean(bulkInputError) || parsedBulkErrors.length > 0}
          className="min-h-40"
          disabled={isBulkSaving}
          placeholder={valuePlaceholder}
          value={bulkInput}
          onChange={(event) => onBulkInputChange(event.target.value)}
        />
        <FieldError id={bulkInputErrorId} message={bulkInputError} />
        {parsedBulkErrors.length > 0 ? (
          <FieldErrorList
            id={bulkInputErrorListId}
            messages={parsedBulkErrors}
            moreLabel={variablesMessages.states.moreLinesPlural}
            singularMoreLabel={variablesMessages.states.moreLinesSingular}
          />
        ) : null}
      </Field>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-sm font-medium text-foreground">
          {variablesMessages.previewTitle}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {previewSummary} {duplicateSummary}
        </p>

        {parsedBulkEntries.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {parsedBulkEntries.slice(0, 6).map((entry) => (
              <Badge key={entry.name} variant="secondary">
                {entry.name}
              </Badge>
            ))}
            {parsedBulkEntries.length > 6 ? (
              <Badge variant="outline">
                {formatMessage(variablesMessages.states.moreEntries, {
                  count: parsedBulkEntries.length - 6,
                })}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function VariablesGlobalSearchDialog({
  actions,
  content,
  state,
  variablesMessages,
}: {
  actions: VariablesGlobalSearchDialogActionsProps
  content: VariablesGlobalSearchDialogContentProps
  state: VariablesGlobalSearchDialogStateProps
  variablesMessages: VariablesMessages
}) {
  return (
    <Dialog
      open={state.isGlobalSearchDialogOpen}
      onOpenChange={actions.onOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[min(80dvh,42rem)] w-[min(calc(100vw-1.5rem),54rem)] p-0"
      >
        <DialogHeader>
          <DialogTitle>{variablesMessages.globalSearch.title}</DialogTitle>
          <DialogDescription>
            {variablesMessages.globalSearch.description}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                id={state.globalSearchInputId}
                name="global_entry_search"
                aria-label={variablesMessages.globalSearch.placeholder}
                autoComplete="off"
                className="sm:flex-1"
                disabled={!state.selectedRepository}
                placeholder={variablesMessages.globalSearch.placeholder}
                value={state.globalSearchQuery}
                onChange={(event) =>
                  actions.onGlobalSearchQueryChange(event.target.value)
                }
              />

              {state.globalSearchQuery ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={actions.onClearSearch}
                >
                  {variablesMessages.clearSearchButton}
                </Button>
              ) : null}
            </div>

            {!state.selectedRepository ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {variablesMessages.selectRepositoryTitle}
                  </EmptyTitle>
                  <EmptyDescription>
                    {variablesMessages.selectRepositoryDescription}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : !state.trimmedGlobalSearchQuery ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {variablesMessages.globalSearch.idleTitle}
                  </EmptyTitle>
                  <EmptyDescription>
                    {variablesMessages.globalSearch.idleDescription}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : state.isGlobalSearchLoading ? (
              <LoadingSearchResults />
            ) : state.globalSearchError ? (
              <Alert variant="destructive">
                <AlertTitle>
                  {variablesMessages.globalSearch.loadingTitle}
                </AlertTitle>
                <AlertDescription>{state.globalSearchError}</AlertDescription>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={actions.onRetry}
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    {variablesMessages.refreshButton}
                  </Button>
                </div>
              </Alert>
            ) : state.filteredResults.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {variablesMessages.globalSearch.noResultsTitle}
                  </EmptyTitle>
                  <EmptyDescription>
                    {variablesMessages.globalSearch.noResultsDescription}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-3">
                {state.filteredResults.map((result) => {
                  const resultScopeConfig = getScopeConfig(
                    variablesMessages,
                    result.scope,
                  )
                  const resultDescription = isSecretScope(result.scope)
                    ? result.visibility
                      ? formatMessage(
                          variablesMessages.states.secretStoredWithVisibility,
                          {
                            visibility: result.visibility,
                          },
                        )
                      : variablesMessages.states.secretStored
                    : (result.value ?? '—')

                  return (
                    <button
                      key={result.id}
                      type="button"
                      className="rounded-xl border border-border/70 bg-background/70 p-4 text-left transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label={formatMessage(
                        variablesMessages.globalSearch.openResultLabel,
                        {
                          name: result.name,
                          scope: resultScopeConfig.title,
                        },
                      )}
                      onClick={() => actions.onOpenResult(result)}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="text-sm font-medium text-foreground">
                              {result.name}
                            </code>
                            <Badge variant="secondary">
                              {resultScopeConfig.tabLabel}
                            </Badge>
                            {result.environmentName ? (
                              <Badge variant="outline">
                                {result.environmentName}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 truncate text-sm text-muted-foreground">
                            {resultDescription}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <PencilLineIcon className="size-4 shrink-0" />
                          <span>
                            {formatDateTime(result.updatedAt, content.locale)}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export function VariablesEnvironmentCreateDialog({
  actions,
  state,
  variablesMessages,
}: {
  actions: VariablesEnvironmentCreateDialogActionsProps
  state: VariablesEnvironmentCreateDialogStateProps
  variablesMessages: VariablesMessages
}) {
  return (
    <Dialog
      open={state.isEnvironmentCreateOpen}
      disablePointerDismissal
      onOpenChange={actions.onOpenChange}
    >
      <DialogContent className="w-[min(calc(100vw-1.5rem),30rem)] p-0">
        <DialogHeader>
          <DialogTitle>
            {variablesMessages.actions.createEnvironment}
          </DialogTitle>
          <DialogDescription>
            {state.selectedRepository
              ? formatMessage(variablesMessages.createEnvironmentDescription, {
                  repository: state.selectedRepository,
                })
              : variablesMessages.selectRepositoryDescription}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <form
            id="create-environment-form"
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              actions.onSubmit()
            }}
          >
            <Field label={variablesMessages.createEnvironmentLabel}>
              <Input
                id={state.environmentNameInputId}
                name="environment_name"
                aria-describedby={
                  state.environmentNameError
                    ? state.environmentNameErrorId
                    : undefined
                }
                aria-invalid={Boolean(state.environmentNameError)}
                autoComplete="off"
                disabled={state.isCreatingEnvironment}
                placeholder="staging"
                spellCheck={false}
                value={state.environmentName}
                onChange={(event) =>
                  actions.onEnvironmentNameChange(event.target.value)
                }
              />
              <FieldError
                id={state.environmentNameErrorId}
                message={state.environmentNameError}
              />
            </Field>
          </form>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={actions.onClose}>
            {variablesMessages.deleteDialogCancel}
          </Button>
          <Button
            type="submit"
            form="create-environment-form"
            disabled={!state.selectedRepository || state.isCreatingEnvironment}
          >
            {state.isCreatingEnvironment ? <ButtonLoadingIcon /> : null}
            {variablesMessages.actions.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VariablesDeleteConfirmDialog({
  actions,
  state,
  variablesMessages,
}: {
  actions: VariablesDeleteConfirmDialogActionsProps
  state: VariablesDeleteConfirmDialogStateProps
  variablesMessages: VariablesMessages
}) {
  return (
    <AlertDialog
      open={Boolean(state.pendingDelete)}
      onOpenChange={actions.onOpenChange}
    >
      <AlertDialogContent
        size="sm"
        className="data-[size=sm]:max-w-sm! sm:data-[size=sm]:max-w-md!"
      >
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <ShieldAlertIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>{state.pendingDeleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {state.pendingDeleteDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state.pendingDeleteEntryNames.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              {variablesMessages.deleteDialog.selectedEntriesLabel}
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/70 bg-muted/30 p-2">
              <ul className="flex flex-col gap-1">
                {state.pendingDeleteEntryNames.map((entryName) => (
                  <li key={entryName}>
                    <code className="block break-all rounded-md bg-background px-2 py-1 text-sm text-foreground">
                      {entryName}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        {state.requiresTypedDeleteConfirmation ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
              <span>{variablesMessages.deleteDialog.confirmationPrefix}</span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="max-w-full rounded-md border border-border/70 bg-muted/40 text-foreground hover:bg-muted/70"
                aria-label={
                  variablesMessages.deleteDialog.copyConfirmationButton
                }
                title={variablesMessages.deleteDialog.copyConfirmationButton}
                disabled={state.isDeleteConfirming}
                onClick={actions.onCopyConfirmationValue}
              >
                <span className="max-w-[min(18rem,calc(100vw-10rem))] truncate font-mono text-foreground sm:max-w-none">
                  {state.pendingDeleteConfirmationValue}
                </span>
                <CopyIcon className="text-muted-foreground" />
              </Button>
              <span>{variablesMessages.deleteDialog.confirmationSuffix}</span>
            </div>
            <Input
              id={state.deleteConfirmationInputId}
              name="delete_confirmation"
              aria-label={formatMessage(
                variablesMessages.deleteDialog.confirmationLabel,
                {
                  value: state.pendingDeleteConfirmationValue,
                },
              )}
              autoComplete="off"
              disabled={state.isDeleteConfirming}
              placeholder={state.pendingDeleteConfirmationValue}
              spellCheck={false}
              value={state.deleteConfirmationValue}
              onChange={(event) =>
                actions.onConfirmationValueChange(event.currentTarget.value)
              }
            />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={state.isDeleteConfirming}>
            {variablesMessages.deleteDialogCancel}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={
              state.isDeleteConfirming ||
              !state.isTypedDeleteConfirmationMatched
            }
            onClick={actions.onConfirm}
          >
            {state.isDeleteConfirming ? <ButtonLoadingIcon /> : null}
            {state.pendingDeleteActionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function VariablesTargetFieldsSkeleton({
  showsEnvironmentTarget,
}: {
  showsEnvironmentTarget: boolean
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>

      {showsEnvironmentTarget ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>

            <div className="flex items-end lg:justify-end">
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function TableSelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ...props
}: Omit<ComponentProps<'input'>, 'checked' | 'onChange' | 'type'> & {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  return (
    <input
      {...props}
      ref={inputRef}
      type="checkbox"
      checked={checked}
      className="h-4 w-4 rounded border border-input bg-background accent-primary"
      onChange={() => onChange()}
    />
  )
}

function SortableTableHead({
  activeDirection,
  activeField,
  field,
  label,
  onClick,
  sortByColumnLabel,
}: {
  activeDirection: VariablesEntrySortDirection
  activeField: VariablesEntrySortField
  field: VariablesEntrySortField
  label: string
  onClick: (field: VariablesEntrySortField) => void
  sortByColumnLabel: string
}) {
  const isActive = activeField === field
  const Icon = !isActive
    ? ChevronsUpDownIcon
    : activeDirection === 'asc'
      ? ChevronUpIcon
      : ChevronDownIcon

  return (
    <TableHead
      aria-sort={
        isActive
          ? activeDirection === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-7 justify-start px-2 text-foreground hover:bg-muted/70"
        aria-label={formatMessage(sortByColumnLabel, { column: label })}
        title={formatMessage(sortByColumnLabel, { column: label })}
        onClick={() => onClick(field)}
      >
        <span>{label}</span>
        <Icon className="text-muted-foreground" />
      </Button>
    </TableHead>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  )
}

function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) {
    return null
  }

  return (
    <p id={id} className="text-sm font-medium text-primary" aria-live="polite">
      {message}
    </p>
  )
}

function FieldErrorList({
  id,
  messages,
  moreLabel,
  singularMoreLabel,
}: {
  id?: string
  messages: string[]
  moreLabel: string
  singularMoreLabel: string
}) {
  return (
    <div
      id={id}
      className="flex flex-col gap-1 text-sm font-medium text-primary"
      aria-live="polite"
    >
      {messages.slice(0, 3).map((message) => (
        <p key={message}>{message}</p>
      ))}
      {messages.length > 3 ? (
        <p>
          {messages.length - 3 === 1
            ? singularMoreLabel
            : formatMessage(moreLabel, { count: messages.length - 3 })}
        </p>
      ) : null}
    </div>
  )
}

export function LoadingTable() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

function LoadingSearchResults() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

import { useState } from 'react'
import {
  CopyIcon,
  PencilLineIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
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
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import type { AppLocale } from '#/messages'
import type {
  GlobalSearchResult,
  PendingDeleteState,
  VariablesMessages,
} from '#/features/variables/domain/variables-types'
import {
  formatDateTime,
  formatMessage,
  getScopeConfig,
  isSecretScope,
} from '#/features/variables/models/variables-helpers'
import {
  ButtonLoadingIcon,
  Field,
  FieldError,
  LoadingSearchResults,
} from './variables-shared'

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
  onSaveResult: (result: GlobalSearchResult, newValue: string) => Promise<void>
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

export type VariablesGlobalSearchDialogProps = {
  actions: VariablesGlobalSearchDialogActionsProps
  content: VariablesGlobalSearchDialogContentProps
  state: VariablesGlobalSearchDialogStateProps
  variablesMessages: VariablesMessages
}

export type VariablesEnvironmentCreateDialogProps = {
  actions: VariablesEnvironmentCreateDialogActionsProps
  state: VariablesEnvironmentCreateDialogStateProps
  variablesMessages: VariablesMessages
}

export type VariablesDeleteConfirmDialogProps = {
  actions: VariablesDeleteConfirmDialogActionsProps
  state: VariablesDeleteConfirmDialogStateProps
  variablesMessages: VariablesMessages
}

export function clearSearchAndFocusInput({
  inputId,
  onClearSearch,
}: {
  inputId: string
  onClearSearch: () => void
}) {
  onClearSearch()

  const input = document.getElementById(inputId) as HTMLInputElement | null

  input?.focus()
}

export function VariablesGlobalSearchDialog({
  actions,
  content,
  state,
  variablesMessages,
}: VariablesGlobalSearchDialogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveErrors, setSaveErrors] = useState<Record<string, string | null>>(
    {},
  )

  function handleValueChange(newValue: string[]) {
    const newId = newValue[0] ?? null

    // Reset the closing item's edit value back to its original
    if (expandedId && expandedId !== newId) {
      const prevResult = state.filteredResults.find((r) => r.id === expandedId)
      if (prevResult) {
        setEditValues((prev) => ({
          ...prev,
          [expandedId]: isSecretScope(prevResult.scope)
            ? ''
            : (prevResult.value ?? ''),
        }))
      }
    }

    setExpandedId(newId)
    if (!newId) return
    setSaveErrors((prev) => ({ ...prev, [newId]: null }))
    const result = state.filteredResults.find((r) => r.id === newId)
    if (result) {
      setEditValues((prev) => {
        if (newId in prev) return prev
        return {
          ...prev,
          [newId]: isSecretScope(result.scope) ? '' : (result.value ?? ''),
        }
      })
    }
  }

  async function handleSave(result: GlobalSearchResult) {
    const newValue = editValues[result.id] ?? ''

    setSavingId(result.id)
    setSaveErrors((prev) => ({ ...prev, [result.id]: null }))

    try {
      await actions.onSaveResult(result, newValue)
      setExpandedId(null)
    } catch (error) {
      const scopeConfig = getScopeConfig(variablesMessages, result.scope)
      setSaveErrors((prev) => ({
        ...prev,
        [result.id]:
          error instanceof Error
            ? error.message
            : formatMessage(variablesMessages.errors.saveFailed, {
                entry: scopeConfig.entryLabel,
              }),
      }))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Dialog
      open={state.isGlobalSearchDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          setExpandedId(null)
          setEditValues({})
          setSaveErrors({})
        }
        actions.onOpenChange(open)
      }}
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
                  onClick={() => {
                    clearSearchAndFocusInput({
                      inputId: state.globalSearchInputId,
                      onClearSearch: actions.onClearSearch,
                    })
                  }}
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
              <Accordion
                multiple={false}
                value={expandedId ? [expandedId] : []}
                onValueChange={handleValueChange}
                className="gap-2"
              >
                {state.filteredResults.map((result) => {
                  const resultScopeConfig = getScopeConfig(
                    variablesMessages,
                    result.scope,
                  )
                  const resultDescription = isSecretScope(result.scope)
                    ? result.visibility
                      ? formatMessage(
                          variablesMessages.states.secretStoredWithVisibility,
                          { visibility: result.visibility },
                        )
                      : variablesMessages.states.secretStored
                    : (result.value ?? '—')
                  const isSaving = savingId === result.id
                  const saveError = saveErrors[result.id]

                  return (
                    <AccordionItem
                      key={result.id}
                      value={result.id}
                      className="overflow-hidden rounded-xl border border-border/70 bg-background/70"
                    >
                      <AccordionTrigger className="rounded-none p-4 font-normal hover:no-underline hover:bg-muted/30">
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
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

                          <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                            <PencilLineIcon className="size-3.5 shrink-0" />
                            <span>
                              {formatDateTime(result.updatedAt, content.locale)}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pb-0 [&_p:not(:last-child)]:mb-0">
                        <div className="flex flex-col gap-3 border-t border-border/70 p-4">
                          {isSecretScope(result.scope) ? (
                            <Alert>
                              <ShieldAlertIcon />
                              <AlertTitle>
                                {variablesMessages.noteSecretEditTitle}
                              </AlertTitle>
                              <AlertDescription>
                                {variablesMessages.noteSecretEditDescription}
                              </AlertDescription>
                            </Alert>
                          ) : null}

                          <Textarea
                            ref={(el) => {
                              if (el && !el.dataset.didSelect) {
                                el.dataset.didSelect = '1'
                                el.select()
                              }
                            }}
                            aria-label={`${variablesMessages.actions.edit} ${result.name}`}
                            className="min-h-20 font-mono text-sm"
                            disabled={isSaving}
                            placeholder={
                              isSecretScope(result.scope) ? '••••••••' : ''
                            }
                            value={editValues[result.id] ?? ''}
                            onChange={(event) => {
                              setEditValues((prev) => ({
                                ...prev,
                                [result.id]: event.target.value,
                              }))
                              if (saveErrors[result.id]) {
                                setSaveErrors((prev) => ({
                                  ...prev,
                                  [result.id]: null,
                                }))
                              }
                            }}
                          />

                          {saveError ? (
                            <p className="text-sm font-medium text-destructive">
                              {saveError}
                            </p>
                          ) : null}

                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isSaving}
                              onClick={() => handleValueChange([])}
                            >
                              {variablesMessages.deleteDialogCancel}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={
                                isSaving ||
                                (isSecretScope(result.scope) &&
                                  !(editValues[result.id] ?? '').trim())
                              }
                              onClick={() => void handleSave(result)}
                            >
                              {isSaving ? <ButtonLoadingIcon /> : null}
                              {variablesMessages.actions.update}
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
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
}: VariablesEnvironmentCreateDialogProps) {
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
                placeholder="preview"
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
}: VariablesDeleteConfirmDialogProps) {
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

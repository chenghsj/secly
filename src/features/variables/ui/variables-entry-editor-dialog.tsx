import { createContext, useContext, type ReactNode } from 'react'
import { ShieldAlertIcon } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { Textarea } from '#/components/ui/textarea'
import type { EditorTab, SettingsScope } from '#/lib/variables-route-search'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  formatMessage,
  isSecretScope,
} from '#/features/variables/models/variables-helpers'
import {
  ButtonLoadingIcon,
  Field,
  FieldError,
  FieldErrorList,
} from './variables-shared'

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

type VariablesEntryEditorDialogContextValue = {
  actions: VariablesEntryEditorDialogActionsProps
  content: VariablesEntryEditorDialogContentProps
  state: VariablesEntryEditorDialogStateProps
  variablesMessages: VariablesMessages
}

export function shouldDisableEntryEditorTabChange({
  isBulkSaving,
  isSaving,
}: {
  isBulkSaving: boolean
  isSaving: boolean
}) {
  return isSaving || isBulkSaving
}

export function shouldDisableEntryEditorDismiss({
  isBulkSaving,
  isSaving,
}: {
  isBulkSaving: boolean
  isSaving: boolean
}) {
  return isSaving || isBulkSaving
}

export type VariablesEntryEditorDialogProps = {
  actions: VariablesEntryEditorDialogActionsProps
  content: VariablesEntryEditorDialogContentProps
  state: VariablesEntryEditorDialogStateProps
  variablesMessages: VariablesMessages
}

const VariablesEntryEditorDialogContext =
  createContext<VariablesEntryEditorDialogContextValue | null>(null)

function useVariablesEntryEditorDialogContext() {
  const context = useContext(VariablesEntryEditorDialogContext)

  if (!context) {
    throw new Error(
      'VariablesEntryEditorDialog subcomponents must be used within VariablesEntryEditorDialog.',
    )
  }

  return context
}

function VariablesEntryEditorDialogBody() {
  const { actions, content, state, variablesMessages } =
    useVariablesEntryEditorDialogContext()
  const isTabChangeDisabled = shouldDisableEntryEditorTabChange({
    isBulkSaving: state.isBulkSaving,
    isSaving: state.isSaving,
  })

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
              onValueChange={(tab) => {
                if (!isTabChangeDisabled) {
                  actions.onTabChange(tab as EditorTab)
                }
              }}
            >
              <TabsList className="w-full">
                <TabsTrigger disabled={isTabChangeDisabled} value="single">
                  {variablesMessages.quickEditTab}
                </TabsTrigger>
                <TabsTrigger disabled={isTabChangeDisabled} value="bulk">
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
  const isDismissDisabled = shouldDisableEntryEditorDismiss({
    isBulkSaving: state.isBulkSaving,
    isSaving: state.isSaving,
  })

  return (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        disabled={isDismissDisabled}
        onClick={actions.onCancel}
      >
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

export function VariablesEntryEditorDialog({
  actions,
  content,
  state,
  variablesMessages,
}: VariablesEntryEditorDialogProps) {
  const isDismissDisabled = shouldDisableEntryEditorDismiss({
    isBulkSaving: state.isBulkSaving,
    isSaving: state.isSaving,
  })

  return (
    <VariablesEntryEditorDialogContext.Provider
      value={{ actions, content, state, variablesMessages }}
    >
      <Dialog
        open={state.open}
        disablePointerDismissal
        onOpenChange={(open, details) => {
          if (!open && isDismissDisabled) {
            return
          }

          actions.onOpenChange(open, details)
        }}
      >
        <DialogContent
          showCloseButton={!isDismissDisabled}
          className="w-[min(calc(100vw-1.5rem),38rem)] p-0"
        >
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

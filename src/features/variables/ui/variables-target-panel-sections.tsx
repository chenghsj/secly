import { PencilLineIcon, PlusIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import {
  SearchableSelect,
  type SearchableSelectItem,
} from '#/components/ui/searchable-select'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import type { SettingsScope } from '#/lib/variables-route-search'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  formatMessage,
  scopeMessageKeys,
  scopeTabDisplayOrder,
} from '#/features/variables/models/variables-helpers'
import {
  ActionSkeletonRow,
  ButtonLoadingIcon,
  FieldError,
  FieldGroup,
  FieldSkeleton,
  ScopeTabsSkeleton,
} from './variables-shared'

export type VariablesTargetPanelScopeProps = {
  activeScope: SettingsScope
}

export type VariablesTargetPanelRepositoryProps = {
  options: string[]
  repositories: Array<{
    canManageEnvironments?: boolean
    nameWithOwner: string
  }>
  selected: string
  error: string | null
}

export type VariablesTargetPanelEnvironmentProps = {
  environments: Array<{ name: string }>
  options: SearchableSelectItem[]
  selected: string
  error: string | null
}

export type VariablesTargetPanelStatusProps = {
  isDeletingEnvironment: boolean
  isEnvironmentActionDisabled: boolean
  isEnvironmentEditing: boolean
  isRefreshingEnvironments: boolean
  isRefreshingRepositories: boolean
  isScopeChangeDisabled: boolean
  isTargetRefreshing: boolean
}

export type VariablesTargetPanelActionsProps = {
  onDeleteEnvironment: () => void
  onDoneEnvironment: () => void
  onEnvironmentChange: (nextEnvironment: string) => void
  onOpenEnvironmentCreate: () => void
  onRefresh: () => void
  onRepositoryChange: (nextRepository: string) => void
  onScopePrefetch?: (nextScope: SettingsScope) => void
  onScopeChange: (nextScope: SettingsScope) => void
  onStartEnvironmentEditing: () => void
}

export type VariablesTargetPanelProps = {
  actions: VariablesTargetPanelActionsProps
  environment: VariablesTargetPanelEnvironmentProps
  repository: VariablesTargetPanelRepositoryProps
  scope: VariablesTargetPanelScopeProps
  status: VariablesTargetPanelStatusProps
  variablesMessages: VariablesMessages
}

export function VariablesTargetSelectField({
  disabled,
  emptyMessage,
  error,
  items,
  label,
  placeholder,
  searchPlaceholder,
  value,
  onValueChange,
}: {
  disabled: boolean
  emptyMessage: string
  error: string | null
  items: SearchableSelectItem[]
  label: string
  placeholder: string
  searchPlaceholder: string
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <FieldGroup label={label}>
      <SearchableSelect
        ariaLabel={label}
        className="w-full"
        disabled={disabled}
        emptyMessage={emptyMessage}
        items={items}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        value={value}
        onValueChange={onValueChange}
      />
      <FieldError message={error} />
    </FieldGroup>
  )
}

export function VariablesScopeField({
  activeScope,
  disabled,
  label,
  labelId,
  onScopePrefetch,
  onScopeChange,
  variablesMessages,
}: {
  activeScope: SettingsScope
  disabled: boolean
  label: string
  labelId: string
  onScopePrefetch?: (nextScope: SettingsScope) => void
  onScopeChange: (nextScope: SettingsScope) => void
  variablesMessages: VariablesMessages
}) {
  function requestScopePrefetch(nextScope: SettingsScope) {
    if (!disabled && nextScope !== activeScope) {
      onScopePrefetch?.(nextScope)
    }
  }

  return (
    <FieldGroup label={label} labelId={labelId}>
      <Tabs
        value={activeScope}
        onValueChange={(nextScope) => {
          if (!disabled) {
            onScopeChange(nextScope as SettingsScope)
          }
        }}
      >
        <TabsList
          aria-labelledby={labelId}
          className="grid! h-auto! w-full! grid-cols-2 gap-2 rounded-2xl p-1.5 sm:inline-flex! sm:w-fit! sm:gap-1 sm:rounded-full sm:p-0.75"
        >
          {scopeTabDisplayOrder.map((nextScope) => {
            const messageKey = scopeMessageKeys[nextScope]
            const config = variablesMessages.scopes[messageKey]

            return (
              <TabsTrigger
                key={nextScope}
                disabled={disabled}
                value={nextScope}
                className="h-8 w-full rounded-full px-3 sm:w-auto"
                onFocus={() => requestScopePrefetch(nextScope)}
                onMouseEnter={() => requestScopePrefetch(nextScope)}
                onPointerDown={() => requestScopePrefetch(nextScope)}
              >
                {config.tabLabel}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>
    </FieldGroup>
  )
}

export function VariablesEnvironmentActions({
  canManageEnvironment,
  environmentSelected,
  isDeletingEnvironment,
  isEditing,
  variablesMessages,
  onDeleteEnvironment,
  onDoneEnvironment,
  onOpenEnvironmentCreate,
  onStartEnvironmentEditing,
}: {
  canManageEnvironment: boolean
  environmentSelected: boolean
  isDeletingEnvironment: boolean
  isEditing: boolean
  variablesMessages: VariablesMessages
  onDeleteEnvironment: () => void
  onDoneEnvironment: () => void
  onOpenEnvironmentCreate: () => void
  onStartEnvironmentEditing: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        disabled={!canManageEnvironment}
        onClick={onOpenEnvironmentCreate}
      >
        <PlusIcon data-icon="inline-start" />
        {variablesMessages.actions.add}
      </Button>

      {isEditing ? (
        <>
          <Button
            type="button"
            variant="destructive"
            disabled={
              !environmentSelected ||
              isDeletingEnvironment ||
              !canManageEnvironment
            }
            onClick={onDeleteEnvironment}
          >
            {isDeletingEnvironment ? <ButtonLoadingIcon /> : null}
            {variablesMessages.actions.delete}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canManageEnvironment}
            onClick={onDoneEnvironment}
          >
            {variablesMessages.actions.done}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={!canManageEnvironment}
          onClick={onStartEnvironmentEditing}
        >
          <PencilLineIcon data-icon="inline-start" />
          {variablesMessages.actions.edit}
        </Button>
      )}
    </div>
  )
}

export function VariablesEnvironmentSection({
  actions,
  canManageEnvironment,
  environment,
  lacksEnvironmentAdminAccess,
  repository,
  status,
  variablesMessages,
}: {
  actions: VariablesTargetPanelActionsProps
  canManageEnvironment: boolean
  environment: VariablesTargetPanelEnvironmentProps
  lacksEnvironmentAdminAccess: boolean
  repository: VariablesTargetPanelRepositoryProps
  status: VariablesTargetPanelStatusProps
  variablesMessages: VariablesMessages
}) {
  const showsEmptyState = environment.environments.length === 0
  const showsAdminAccessDescription =
    lacksEnvironmentAdminAccess && !showsEmptyState

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <VariablesTargetSelectField
            disabled={!environment.options.length}
            emptyMessage={variablesMessages.selectionSearchEmpty}
            error={environment.error}
            items={environment.options}
            label={variablesMessages.environmentLabel}
            placeholder={variablesMessages.environmentLabel}
            searchPlaceholder={variablesMessages.environmentSearchPlaceholder}
            value={environment.selected}
            onValueChange={actions.onEnvironmentChange}
          />
        </div>

        <div className="flex items-end lg:justify-end">
          <VariablesEnvironmentActions
            canManageEnvironment={canManageEnvironment}
            environmentSelected={Boolean(environment.selected)}
            isDeletingEnvironment={status.isDeletingEnvironment}
            isEditing={status.isEnvironmentEditing}
            variablesMessages={variablesMessages}
            onDeleteEnvironment={actions.onDeleteEnvironment}
            onDoneEnvironment={actions.onDoneEnvironment}
            onOpenEnvironmentCreate={actions.onOpenEnvironmentCreate}
            onStartEnvironmentEditing={actions.onStartEnvironmentEditing}
          />
        </div>
      </div>

      {showsAdminAccessDescription ? (
        <p className="text-sm text-muted-foreground">
          {variablesMessages.environmentAdminAccessDescription}
        </p>
      ) : null}

      {showsEmptyState ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{variablesMessages.noEnvironmentsTitle}</EmptyTitle>
            <EmptyDescription>
              {lacksEnvironmentAdminAccess
                ? variablesMessages.environmentAdminAccessDescription
                : formatMessage(variablesMessages.noEnvironmentsDescription, {
                    repository: repository.selected,
                  })}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  )
}

function VariablesTargetSelectFieldSkeleton() {
  return <FieldSkeleton />
}

function VariablesScopeFieldSkeleton() {
  return <FieldSkeleton labelClassName="w-16" control={<ScopeTabsSkeleton />} />
}

function VariablesEnvironmentSectionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <VariablesTargetSelectFieldSkeleton />
        </div>

        <div className="flex items-end lg:justify-end">
          <ActionSkeletonRow widths={['w-20', 'w-20']} />
        </div>
      </div>
    </div>
  )
}

export function VariablesTargetFieldsSkeleton({
  showsEnvironmentTarget,
}: {
  showsEnvironmentTarget: boolean
}) {
  return (
    <>
      <VariablesTargetSelectFieldSkeleton />

      <VariablesScopeFieldSkeleton />

      {showsEnvironmentTarget ? <VariablesEnvironmentSectionSkeleton /> : null}
    </>
  )
}

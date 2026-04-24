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
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group'
import type { SettingsScope } from '#/lib/variables-route-search'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  formatMessage,
  isEnvironmentScope,
  isSecretScope,
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

type ScopeTargetLevel = 'repository' | 'environment'
type ScopeSettingKind = 'variables' | 'secrets'

const scopeTargetLevels: ScopeTargetLevel[] = ['repository', 'environment']
const scopeSettingKinds: ScopeSettingKind[] = ['variables', 'secrets']

const scopeToggleGroupClassName =
  'inline-grid! w-fit! max-w-full! grid-flow-col auto-cols-max rounded-lg border border-border/70 bg-muted/45 p-0.5 shadow-inner shadow-black/5 dark:border-white/10 dark:bg-black/10 dark:shadow-black/20'

const scopeToggleItemClassName =
  'h-8 min-w-20 rounded-md border border-transparent bg-transparent px-2.5 text-sm text-muted-foreground shadow-none transition-[color,background-color,border-color,box-shadow] hover:border-border/50 hover:bg-background/75 hover:text-foreground data-pressed:border-border data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm dark:text-foreground/70 dark:hover:border-white/10 dark:hover:bg-white/[0.06] dark:hover:text-foreground dark:data-pressed:border-white/12 dark:data-pressed:bg-card dark:data-pressed:text-foreground'

function getScopeTargetLevel(scope: SettingsScope): ScopeTargetLevel {
  return isEnvironmentScope(scope) ? 'environment' : 'repository'
}

function getScopeSettingKind(scope: SettingsScope): ScopeSettingKind {
  return isSecretScope(scope) ? 'secrets' : 'variables'
}

function resolveScopeFromDimensions(
  targetLevel: ScopeTargetLevel,
  settingKind: ScopeSettingKind,
): SettingsScope {
  if (targetLevel === 'environment') {
    return settingKind === 'secrets'
      ? 'environment-secrets'
      : 'environment-variables'
  }

  return settingKind === 'secrets'
    ? 'repository-secrets'
    : 'repository-variables'
}

export function VariablesTargetSelectField({
  disabled,
  emptyMessage,
  error,
  items,
  label,
  loading = false,
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
  loading?: boolean
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
        loading={loading}
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
  const activeSettingKind = getScopeSettingKind(activeScope)
  const activeTargetLevel = getScopeTargetLevel(activeScope)
  const targetLevelLabels: Record<ScopeTargetLevel, string> = {
    environment: variablesMessages.environmentLabel,
    repository: variablesMessages.repositoryLabel,
  }

  function requestScopePrefetch(nextScope: SettingsScope) {
    if (!disabled && nextScope !== activeScope) {
      onScopePrefetch?.(nextScope)
    }
  }

  function requestScopeChange(nextScope: SettingsScope) {
    if (!disabled && nextScope !== activeScope) {
      onScopeChange(nextScope)
    }
  }

  return (
    <FieldGroup label={label} labelId={labelId}>
      <ToggleGroup
        data-testid="scope-target-level-group"
        aria-label={variablesMessages.scopeTargetLabel}
        className={scopeToggleGroupClassName}
        spacing={1}
        size="lg"
        type="single"
        value={activeTargetLevel}
        variant="default"
        onValueChange={(nextTargetLevel) => {
          if (!nextTargetLevel) {
            return
          }

          requestScopeChange(
            resolveScopeFromDimensions(
              nextTargetLevel as ScopeTargetLevel,
              activeSettingKind,
            ),
          )
        }}
      >
        {scopeTargetLevels.map((nextTargetLevel) => {
          const nextScope = resolveScopeFromDimensions(
            nextTargetLevel,
            activeSettingKind,
          )

          return (
            <ToggleGroupItem
              key={nextTargetLevel}
              aria-label={targetLevelLabels[nextTargetLevel]}
              className={scopeToggleItemClassName}
              disabled={disabled}
              value={nextTargetLevel}
              onFocus={() => requestScopePrefetch(nextScope)}
              onMouseEnter={() => requestScopePrefetch(nextScope)}
              onPointerDown={() => requestScopePrefetch(nextScope)}
            >
              {targetLevelLabels[nextTargetLevel]}
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </FieldGroup>
  )
}

export function VariablesScopeSettingKindTabs({
  activeScope,
  disabled,
  onScopePrefetch,
  onScopeChange,
  variablesMessages,
}: {
  activeScope: SettingsScope
  disabled: boolean
  onScopePrefetch?: (nextScope: SettingsScope) => void
  onScopeChange: (nextScope: SettingsScope) => void
  variablesMessages: VariablesMessages
}) {
  const activeTargetLevel = getScopeTargetLevel(activeScope)
  const activeSettingKind = getScopeSettingKind(activeScope)
  const settingKindLabels: Record<ScopeSettingKind, string> = {
    secrets: variablesMessages.scopes.repositorySecrets.entryTitle,
    variables: variablesMessages.scopes.repositoryVariables.entryTitle,
  }

  function requestScopePrefetch(nextScope: SettingsScope) {
    if (!disabled && nextScope !== activeScope) {
      onScopePrefetch?.(nextScope)
    }
  }

  function requestScopeChange(nextScope: SettingsScope) {
    if (!disabled && nextScope !== activeScope) {
      onScopeChange(nextScope)
    }
  }

  return (
    <ToggleGroup
      data-testid="scope-setting-kind-group"
      aria-label={variablesMessages.scopeContentLabel}
      className={scopeToggleGroupClassName}
      spacing={1}
      size="lg"
      type="single"
      value={activeSettingKind}
      variant="default"
      onValueChange={(nextSettingKind) => {
        if (!nextSettingKind) {
          return
        }

        requestScopeChange(
          resolveScopeFromDimensions(
            activeTargetLevel,
            nextSettingKind as ScopeSettingKind,
          ),
        )
      }}
    >
      {scopeSettingKinds.map((nextSettingKind) => {
        const nextScope = resolveScopeFromDimensions(
          activeTargetLevel,
          nextSettingKind,
        )

        return (
          <ToggleGroupItem
            key={nextSettingKind}
            aria-label={settingKindLabels[nextSettingKind]}
            className={scopeToggleItemClassName}
            disabled={disabled}
            value={nextSettingKind}
            onFocus={() => requestScopePrefetch(nextScope)}
            onMouseEnter={() => requestScopePrefetch(nextScope)}
            onPointerDown={() => requestScopePrefetch(nextScope)}
          >
            {settingKindLabels[nextSettingKind]}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
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
  const showsEmptyState =
    environment.environments.length === 0 && !status.isRefreshingEnvironments
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
            loading={status.isRefreshingEnvironments}
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

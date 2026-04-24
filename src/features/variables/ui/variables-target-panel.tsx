import { RefreshCwIcon } from 'lucide-react'
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import { isEnvironmentScope } from '#/features/variables/models/variables-helpers'
import {
  VariablesEnvironmentSection,
  VariablesScopeField,
  VariablesTargetFieldsSkeleton,
  VariablesTargetSelectField,
  type VariablesTargetPanelProps,
} from './variables-target-panel-sections.tsx'

export type { VariablesTargetPanelProps } from './variables-target-panel-sections.tsx'

export function VariablesTargetPanel({
  scope,
  repository,
  environment,
  status,
  actions,
  variablesMessages,
}: VariablesTargetPanelProps) {
  const scopeLabelId = 'variables-target-panel-scope-label'
  const selectedRepository = repository.repositories.find(
    (entry) => entry.nameWithOwner === repository.selected,
  )
  const lacksEnvironmentAdminAccess =
    Boolean(repository.selected) &&
    selectedRepository?.canManageEnvironments === false
  const canManageEnvironment =
    Boolean(repository.selected) &&
    selectedRepository?.canManageEnvironments !== false &&
    !status.isEnvironmentActionDisabled

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
            <VariablesTargetSelectField
              disabled={status.isRefreshingRepositories}
              emptyMessage={variablesMessages.selectionSearchEmpty}
              error={repository.error}
              items={repository.options}
              label={variablesMessages.repositoryLabel}
              placeholder={variablesMessages.repositoryLabel}
              searchPlaceholder={variablesMessages.repositorySearchPlaceholder}
              value={repository.selected}
              onValueChange={actions.onRepositoryChange}
            />

            <VariablesScopeField
              activeScope={scope.activeScope}
              disabled={status.isScopeChangeDisabled}
              label={variablesMessages.scopeLabel}
              labelId={scopeLabelId}
              onScopePrefetch={actions.onScopePrefetch}
              onScopeChange={actions.onScopeChange}
              variablesMessages={variablesMessages}
            />

            {isEnvironmentScope(scope.activeScope) ? (
              <VariablesEnvironmentSection
                actions={actions}
                canManageEnvironment={canManageEnvironment}
                environment={environment}
                lacksEnvironmentAdminAccess={lacksEnvironmentAdminAccess}
                repository={repository}
                status={status}
                variablesMessages={variablesMessages}
              />
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}

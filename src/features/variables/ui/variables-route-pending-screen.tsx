import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import { LoadingTable } from '#/features/variables/ui'

function VariablesSearchTriggerSkeleton() {
  return <Skeleton className="h-8 w-40 rounded-lg lg:shrink-0" />
}

function VariablesTargetFieldsSkeleton({
  showsEnvironmentTarget,
}: {
  showsEnvironmentTarget: boolean
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-11 w-full rounded-md sm:h-10 sm:w-29"
            />
          ))}
        </div>
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

export function VariablesRoutePendingScreen({
  messages,
  showsEnvironmentTarget,
}: {
  messages: Pick<VariablesMessages, 'pending'>
  showsEnvironmentTarget: boolean
}) {
  return (
    <main className="page-wrap flex min-h-full flex-col gap-6 px-4 py-6 sm:py-8">
      <section className="flex flex-col gap-4">
        <div className="flex justify-end">
          <VariablesSearchTriggerSkeleton />
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{messages.pending.targetTitle}</CardTitle>
            <CardDescription>
              {messages.pending.targetDescription}
            </CardDescription>
            <CardAction>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <VariablesTargetFieldsSkeleton
              showsEnvironmentTarget={showsEnvironmentTarget}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{messages.pending.listTitle}</CardTitle>
            <CardDescription>
              {messages.pending.listDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-1">
                <Skeleton className="h-8 w-full rounded-lg sm:flex-1" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            </div>
            <LoadingTable />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

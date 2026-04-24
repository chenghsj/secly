import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { Button, buttonVariants } from '#/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '#/components/ui/empty'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'

export function VariablesRouteScreen({
  deleteDialog,
  entriesPanel,
  entryEditorDialog,
  environmentCreateDialog,
  globalSearchDialog,
  isAuthenticated,
  isGlobalSearchDialogOpen,
  onOpenGlobalSearch,
  scopeTitle,
  targetPanel,
  variablesMessages,
}: {
  deleteDialog: ReactNode
  entriesPanel: ReactNode
  entryEditorDialog: ReactNode
  environmentCreateDialog: ReactNode
  globalSearchDialog: ReactNode
  isAuthenticated: boolean
  isGlobalSearchDialogOpen: boolean
  onOpenGlobalSearch: () => void
  scopeTitle: string
  targetPanel: ReactNode
  variablesMessages: VariablesMessages
}) {
  return (
    <main className="page-wrap flex min-h-full flex-col gap-6 px-4 py-6 sm:py-8">
      <section className="flex flex-col gap-4">
        <div className="flex justify-end">
          <h1 className="sr-only">{scopeTitle}</h1>

          {isAuthenticated ? (
            <Button
              type="button"
              variant="outline"
              aria-haspopup="dialog"
              aria-expanded={isGlobalSearchDialogOpen}
              aria-label={variablesMessages.globalSearch.title}
              className="self-start"
              title={variablesMessages.globalSearch.title}
              onClick={onOpenGlobalSearch}
            >
              <SearchIcon
                data-icon="inline-start"
                className="text-muted-foreground"
              />
              <span className="text-foreground">
                {variablesMessages.globalSearch.title}
              </span>
            </Button>
          ) : null}
        </div>
      </section>

      {!isAuthenticated ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{variablesMessages.unauthenticatedTitle}</EmptyTitle>
            <EmptyDescription>
              {variablesMessages.unauthenticatedDescription}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/connect"
              className={`${buttonVariants({ size: 'lg' })} no-underline`}
            >
              {variablesMessages.openAccountButton}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {targetPanel}

            {entriesPanel}
          </div>

          {globalSearchDialog}

          {entryEditorDialog}

          {environmentCreateDialog}
        </>
      )}

      {deleteDialog}
    </main>
  )
}

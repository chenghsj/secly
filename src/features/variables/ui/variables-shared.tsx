import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  Loader2Icon,
} from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { TableHead } from '#/components/ui/table'
import type {
  VariablesEntrySortDirection,
  VariablesEntrySortField,
} from '#/lib/variables-route-search'
import { cn } from '#/lib/utils'
import { formatMessage } from '#/features/variables/models/variables-helpers'

export function ButtonLoadingIcon() {
  return <Loader2Icon data-icon="inline-start" className="animate-spin" />
}

const fieldContainerClassName =
  'flex flex-col gap-2 text-sm font-medium text-foreground'

type BaseFieldProps = {
  children: ReactNode
  label: string
  labelId?: string
}

export function FieldGroup({ children, label, labelId }: BaseFieldProps) {
  return (
    <div className={fieldContainerClassName}>
      <span id={labelId}>{label}</span>
      {children}
    </div>
  )
}

export function Field({ children, label, labelId }: BaseFieldProps) {
  return (
    <label className={fieldContainerClassName}>
      <span id={labelId}>{label}</span>
      {children}
    </label>
  )
}

export function FieldError({
  id,
  message,
}: {
  id?: string
  message?: string | null
}) {
  if (!message) {
    return null
  }

  return (
    <p id={id} className="text-sm font-medium text-primary" aria-live="polite">
      {message}
    </p>
  )
}

export function FieldErrorList({
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

export function TableSelectionCheckbox({
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

export function SortableTableHead({
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

export function RepeatedSkeletons({
  className,
  count,
}: {
  className: string
  count: number
}) {
  return Array.from({ length: count }).map((_, index) => (
    <Skeleton key={index} className={className} />
  ))
}

export function FieldSkeleton({
  control,
  controlClassName = 'h-8 w-full rounded-lg',
  labelClassName = 'w-24',
}: {
  control?: ReactNode
  controlClassName?: string
  labelClassName?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className={cn('h-4', labelClassName)} />
      {control ?? <Skeleton className={controlClassName} />}
    </div>
  )
}

export function ScopeTabsSkeleton() {
  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <Skeleton className="h-3 w-10" />
        <div className="inline-grid w-fit max-w-full grid-flow-col auto-cols-max gap-1 rounded-lg bg-muted/25 p-0.5">
          <RepeatedSkeletons count={2} className="h-8 w-20 rounded-md" />
        </div>
      </div>

      <div className="grid gap-1">
        <Skeleton className="h-3 w-10" />
        <div className="inline-grid w-fit max-w-full grid-flow-col auto-cols-max gap-1 rounded-lg bg-muted/25 p-0.5">
          <RepeatedSkeletons count={2} className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  )
}

export function ActionSkeletonRow({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {widths.map((widthClassName, index) => (
        <Skeleton
          key={`${widthClassName}-${index}`}
          className={cn('h-8 rounded-lg', widthClassName)}
        />
      ))}
    </div>
  )
}

export function LoadingTable() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-10 w-full" />
      <RepeatedSkeletons count={3} className="h-12 w-full" />
    </div>
  )
}

export function InlineBusyState({
  className,
  label,
}: {
  className?: string
  label: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border/60 bg-muted/35 px-3 py-2 text-sm text-muted-foreground',
        className,
      )}
    >
      <Loader2Icon className="size-4 shrink-0 animate-spin text-foreground/70" />
      <span>{label}</span>
    </div>
  )
}

export function LoadingSearchResults() {
  return (
    <div className="grid gap-3">
      <RepeatedSkeletons count={3} className="h-12 w-full rounded-xl" />
    </div>
  )
}

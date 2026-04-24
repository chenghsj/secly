'use client'

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group'
import { type VariantProps } from 'class-variance-authority'
import type { CSSProperties, ReactNode } from 'react'

import { cn } from '#/lib/utils'
import { toggleVariants } from '#/components/ui/toggle'

type ToggleGroupType = 'single' | 'multiple'

type ToggleGroupValue = string | readonly string[] | undefined

type ToggleGroupProps = Omit<
  ToggleGroupPrimitive.Props<string>,
  'defaultValue' | 'multiple' | 'onValueChange' | 'value'
> &
  VariantProps<typeof toggleVariants> & {
    children?: ReactNode
    defaultValue?: ToggleGroupValue
    onValueChange?: (value: string | string[]) => void
    orientation?: 'horizontal' | 'vertical'
    spacing?: number
    type?: ToggleGroupType
    value?: ToggleGroupValue
  }

function normalizeGroupValue(
  value: ToggleGroupValue,
  type: ToggleGroupType,
): string[] | undefined {
  if (value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    return [...value]
  }

  if (type === 'multiple') {
    return value ? [value] : []
  }

  return value ? [value] : []
}

function mapGroupValueForConsumer(
  value: string[],
  type: ToggleGroupType,
): string | string[] {
  if (type === 'multiple') {
    return value
  }

  return value[0] ?? ''
}

function ToggleGroup({
  className,
  variant,
  size,
  spacing = 0,
  orientation = 'horizontal',
  children,
  defaultValue,
  onValueChange,
  type = 'single',
  value,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      defaultValue={normalizeGroupValue(defaultValue, type)}
      multiple={type === 'multiple'}
      style={{ '--gap': spacing } as CSSProperties}
      value={normalizeGroupValue(value, type)}
      className={cn(
        'group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-vertical:flex-col data-vertical:items-stretch',
        className,
      )}
      onValueChange={(nextValue) => {
        onValueChange?.(mapGroupValueForConsumer(nextValue, type))
      }}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant = 'default',
  size = 'default',
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={variant}
      data-size={size}
      className={cn(
        'shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t',
        toggleVariants({ variant, size }),
        className,
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  )
}

export { ToggleGroup, ToggleGroupItem }

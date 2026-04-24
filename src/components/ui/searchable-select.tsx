import * as React from 'react'
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox'
import {
  CheckIcon,
  ChevronDownIcon,
  Loader2Icon,
  SearchIcon,
} from 'lucide-react'

import { cn } from '#/lib/utils'

export type SearchableSelectItem =
  | string
  | {
      disabled?: boolean
      label: string
      value: string
    }

function getItemLabel(item: SearchableSelectItem) {
  return typeof item === 'string' ? item : item.label
}

function getItemValue(item: SearchableSelectItem) {
  return typeof item === 'string' ? item : item.value
}

function isItemDisabled(item: SearchableSelectItem) {
  return typeof item === 'string' ? false : Boolean(item.disabled)
}

type SearchableSelectProps = {
  ariaLabel: string
  className?: string
  disabled?: boolean
  emptyMessage: string
  items: SearchableSelectItem[]
  loading?: boolean
  onValueChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
  value?: string
}

function SearchableSelect({
  ariaLabel,
  className,
  disabled = false,
  emptyMessage,
  items,
  loading = false,
  onValueChange,
  placeholder,
  searchPlaceholder,
  value,
}: SearchableSelectProps) {
  const [inputValue, setInputValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const [suppressAutoFocusOutline, setSuppressAutoFocusOutline] =
    React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const selectedValue = React.useMemo(() => {
    if (!value) {
      return null
    }

    return items.find((item) => getItemValue(item) === value) ?? null
  }, [items, value])

  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isOpen])

  return (
    <ComboboxPrimitive.Root
      items={items}
      itemToStringLabel={getItemLabel}
      itemToStringValue={getItemValue}
      value={selectedValue}
      inputValue={inputValue}
      disabled={disabled}
      onInputValueChange={(nextInputValue) => {
        setInputValue(nextInputValue)
      }}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen)

        if (nextOpen) {
          setSuppressAutoFocusOutline(true)
          return
        }

        setInputValue('')
        setSuppressAutoFocusOutline(false)
      }}
      onValueChange={(nextValue) => {
        onValueChange(nextValue ? getItemValue(nextValue) : '')
        setInputValue('')
      }}
    >
      <ComboboxPrimitive.Trigger
        aria-label={ariaLabel}
        aria-busy={loading ? 'true' : undefined}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
      >
        <span className="flex min-w-0 flex-1 items-center text-left">
          <ComboboxPrimitive.Value>
            {(selectedItem: SearchableSelectItem | null) =>
              selectedItem ? (
                <span className="block truncate">
                  {getItemLabel(selectedItem)}
                </span>
              ) : (
                <span className="block truncate text-muted-foreground">
                  {placeholder}
                </span>
              )
            }
          </ComboboxPrimitive.Value>
        </span>
        {loading ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        )}
      </ComboboxPrimitive.Trigger>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner
          side="bottom"
          sideOffset={4}
          align="start"
          className="isolate z-50"
        >
          <ComboboxPrimitive.Popup
            initialFocus={false}
            data-slot="searchable-select-content"
            className="relative isolate z-50 flex max-h-(--available-height) w-(--anchor-width) min-w-36 flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          >
            <div className="border-b border-border/70 bg-popover p-1.5">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <ComboboxPrimitive.Input
                  ref={inputRef}
                  aria-label={searchPlaceholder}
                  autoComplete="off"
                  data-auto-focus-outline={
                    suppressAutoFocusOutline ? 'suppressed' : undefined
                  }
                  placeholder={searchPlaceholder}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent py-1 pr-2.5 pl-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[auto-focus-outline=suppressed]:focus-visible:border-input data-[auto-focus-outline=suppressed]:focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
                  onBlur={() => {
                    setSuppressAutoFocusOutline(false)
                  }}
                />
              </div>
            </div>

            <ComboboxPrimitive.Empty className="contents">
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            </ComboboxPrimitive.Empty>

            <ComboboxPrimitive.List className="overflow-y-auto p-1">
              {(item: SearchableSelectItem) => (
                <ComboboxPrimitive.Item
                  key={getItemValue(item)}
                  value={item}
                  disabled={isItemDisabled(item)}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-selected:font-medium data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {getItemLabel(item)}
                  </span>
                  <ComboboxPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { SearchableSelect }

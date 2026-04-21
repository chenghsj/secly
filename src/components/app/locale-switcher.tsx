import { useState } from 'react'
import { CheckIcon, LanguagesIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { useAppPreferences } from './app-settings-provider'

export function LocaleSwitcher() {
  const { locale, messages, setLocale } = useAppPreferences()
  const [open, setOpen] = useState(false)

  const localeOptions = [
    { value: 'en' as const, label: 'English' },
    { value: 'zh-TW' as const, label: '繁體' },
    { value: 'zh-CN' as const, label: '簡體' },
  ]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={messages.locale.label}
            title={messages.locale.label}
          />
        }
      >
        <LanguagesIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{messages.locale.label}</DropdownMenuLabel>
          {localeOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                setLocale(option.value)
                setOpen(false)
              }}
            >
              <span>{option.label}</span>
              {locale === option.value ? (
                <CheckIcon className="ml-auto" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

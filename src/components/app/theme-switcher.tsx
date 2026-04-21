import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useAppPreferences } from './app-settings-provider'

export function ThemeSwitcher() {
  const { messages, themeMode, setThemeMode } = useAppPreferences()
  const nextTheme = themeMode === 'dark' ? 'light' : 'dark'
  const ThemeIcon = themeMode === 'dark' ? MoonIcon : SunIcon

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={messages.theme.label}
      aria-pressed={themeMode === 'dark'}
      title={`${messages.theme.label}: ${messages.theme[themeMode]} -> ${messages.theme[nextTheme]}`}
      onClick={() => setThemeMode(nextTheme)}
    >
      <ThemeIcon />
    </Button>
  )
}

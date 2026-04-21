import { LocaleSwitcher } from './locale-switcher'
import { ThemeSwitcher } from './theme-switcher'

export function ConnectGuestCardControls() {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1 shadow-xs backdrop-blur supports-backdrop-filter:bg-background/75">
      <ThemeSwitcher />
      <LocaleSwitcher />
    </div>
  )
}

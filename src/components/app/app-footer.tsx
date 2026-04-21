import { APP_DATA_ROOT_DISPLAY, CLI_NAME } from '../../lib/product'
import { useAppPreferences } from './app-settings-provider'

export function AppFooter() {
  const { messages } = useAppPreferences()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t px-4 py-6">
      <div className="page-wrap flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="m-0 text-sm">&copy; {year} GH VarDeck</p>
          <p className="m-0 text-sm">
            <span className="font-medium text-foreground">
              {messages.common.appDataRootLabel}:
            </span>{' '}
            <code>{APP_DATA_ROOT_DISPLAY}</code>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="m-0">TanStack Start + Vite</p>
          <p className="m-0">
            <span className="font-medium text-foreground">CLI</span>{' '}
            <code>{CLI_NAME}</code>
          </p>
        </div>
      </div>
    </footer>
  )
}

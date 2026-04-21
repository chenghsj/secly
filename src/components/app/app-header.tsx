import { Link } from '@tanstack/react-router'
import { Badge } from '#/components/ui/badge'
import { LocaleSwitcher } from './locale-switcher'
import { ThemeSwitcher } from './theme-switcher'
import { useAppPreferences } from './app-settings-provider'

export function AppHeader() {
  const { messages } = useAppPreferences()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="page-wrap flex flex-col gap-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="text-base font-semibold text-foreground no-underline"
          >
            GH VarDeck
          </Link>

          <Badge variant="outline">{messages.common.foundationStatus}</Badge>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <LocaleSwitcher />
            <ThemeSwitcher />
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            to="/"
            className="text-muted-foreground no-underline hover:text-foreground"
            activeProps={{ className: 'text-foreground no-underline' }}
          >
            {messages.nav.home}
          </Link>
          <Link
            to="/connect"
            className="text-muted-foreground no-underline hover:text-foreground"
            activeProps={{ className: 'text-foreground no-underline' }}
          >
            {messages.nav.connect}
          </Link>
          <Link
            to="/variables"
            search={() => ({})}
            className="text-muted-foreground no-underline hover:text-foreground"
            activeProps={{ className: 'text-foreground no-underline' }}
          >
            {messages.nav.variables}
          </Link>
          <a
            href="https://cli.github.com/manual/gh_auth_login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground no-underline hover:text-foreground"
          >
            {messages.nav.githubAppDocs}
          </a>
        </nav>
      </div>
    </header>
  )
}

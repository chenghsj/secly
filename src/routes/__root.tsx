import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { AppShell } from '../components/app/app-shell'
import { APP_DESCRIPTION, APP_NAME } from '../lib/product'

import appCss from '../styles.css?url'

const APP_INIT_SCRIPT = `(function(){try{var themeKey='gh-vardeck:theme';var localeKey='gh-vardeck:locale';var storedTheme=window.localStorage.getItem(themeKey);var theme=(storedTheme==='light'||storedTheme==='dark')?storedTheme:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(theme);root.setAttribute('data-theme',theme);root.style.colorScheme=theme;var storedLocale=window.localStorage.getItem(localeKey);var locale=(storedLocale==='en'||storedLocale==='zh-CN'||storedLocale==='zh-TW')?storedLocale:(window.navigator.language||'en');var normalized=locale.toLowerCase();if(normalized.indexOf('zh-tw')===0||normalized.indexOf('zh-hk')===0){locale='zh-TW'}else if(normalized.indexOf('zh')===0){locale='zh-CN'}else{locale='en'}root.lang=locale;root.setAttribute('data-locale',locale);}catch(e){}})();`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: APP_NAME,
      },
      {
        name: 'description',
        content: APP_DESCRIPTION,
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootAppShell,
  shellComponent: RootDocument,
})

function RootAppShell() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APP_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="overflow-hidden font-sans antialiased wrap-anywhere">
        {children}
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'TanStack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}

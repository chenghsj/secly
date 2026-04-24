import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { defaultLocale, resolveLocale, translations } from '../../messages'
import type { AppLocale } from '../../messages'
import {
  LEGACY_LOCALE_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../../lib/product'

export type ThemeMode = 'light' | 'dark'

type AppSettingsContextValue = {
  locale: AppLocale
  messages: (typeof translations)[AppLocale]
  resolvedTheme: 'light' | 'dark'
  themeMode: ThemeMode
  setLocale: (locale: AppLocale) => void
  setThemeMode: (mode: ThemeMode) => void
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)
const fallbackAppSettingsContext: AppSettingsContextValue = {
  locale: defaultLocale,
  messages: translations[defaultLocale],
  resolvedTheme: 'light',
  themeMode: 'light',
  setLocale: () => {},
  setThemeMode: () => {},
}

let hasWarnedMissingAppSettingsProvider = false

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light' as const
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function normalizeStoredTheme(value: string | null): ThemeMode {
  return value === 'dark' || value === 'light' ? value : getSystemTheme()
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') {
    return 'light' as const
  }

  const root = window.document.documentElement

  root.classList.remove('light', 'dark')
  root.classList.add(mode)
  root.setAttribute('data-theme', mode)
  root.style.colorScheme = mode

  return mode
}

function applyLocale(locale: AppLocale) {
  if (typeof window === 'undefined') {
    return
  }

  const root = window.document.documentElement
  root.lang = locale
  root.setAttribute('data-locale', locale)
}

function migrateStoredPreference({
  legacyKey,
  nextKey,
}: {
  legacyKey: string
  nextKey: string
}) {
  const nextValue = window.localStorage.getItem(nextKey)

  if (nextValue !== null) {
    return nextValue
  }

  const legacyValue = window.localStorage.getItem(legacyKey)

  if (legacyValue !== null) {
    window.localStorage.setItem(nextKey, legacyValue)
    window.localStorage.removeItem(legacyKey)
  }

  return legacyValue
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(defaultLocale)
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const storedTheme = migrateStoredPreference({
      legacyKey: LEGACY_THEME_STORAGE_KEY,
      nextKey: THEME_STORAGE_KEY,
    })
    const initialTheme = normalizeStoredTheme(storedTheme)

    const storedLocale = migrateStoredPreference({
      legacyKey: LEGACY_LOCALE_STORAGE_KEY,
      nextKey: LOCALE_STORAGE_KEY,
    })
    const initialLocale = resolveLocale(
      storedLocale ?? window.navigator.language,
    )

    window.localStorage.setItem(THEME_STORAGE_KEY, initialTheme)
    setThemeModeState(initialTheme)
    setResolvedTheme(applyThemeMode(initialTheme))
    setLocaleState(initialLocale)
    applyLocale(initialLocale)
  }, [])

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode)
    window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    window.localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    setResolvedTheme(applyThemeMode(mode))
  }

  function setLocale(localeValue: AppLocale) {
    setLocaleState(localeValue)
    window.localStorage.setItem(LOCALE_STORAGE_KEY, localeValue)
    window.localStorage.removeItem(LEGACY_LOCALE_STORAGE_KEY)
    applyLocale(localeValue)
  }

  return (
    <AppSettingsContext.Provider
      value={{
        locale,
        messages: translations[locale],
        resolvedTheme,
        themeMode,
        setLocale,
        setThemeMode,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppPreferences() {
  const context = useContext(AppSettingsContext)

  if (!context) {
    if (import.meta.env.DEV) {
      if (!hasWarnedMissingAppSettingsProvider) {
        hasWarnedMissingAppSettingsProvider = true
        console.warn(
          'useAppPreferences rendered before AppSettingsProvider was available; using fallback settings.',
        )
      }

      return fallbackAppSettingsContext
    }

    throw new Error('useAppPreferences must be used inside AppSettingsProvider')
  }

  return context
}

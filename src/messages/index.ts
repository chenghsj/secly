import { enMessages } from './en'
import { zhCnMessages } from './zh-cn'
import { zhTwMessages } from './zh-tw'

export type AppLocale = 'en' | 'zh-CN' | 'zh-TW'

export type AppMessages = typeof enMessages

export const defaultLocale: AppLocale = 'en'

export const translations: Record<AppLocale, AppMessages> = {
  en: enMessages,
  'zh-CN': zhCnMessages,
  'zh-TW': zhTwMessages,
}

export function resolveLocale(input?: string | null): AppLocale {
  if (!input) {
    return defaultLocale
  }

  const normalized = input.toLowerCase()

  if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk')) {
    return 'zh-TW'
  }

  if (normalized.startsWith('zh')) {
    return 'zh-CN'
  }

  return 'en'
}

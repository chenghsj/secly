import { enMessages } from './en'
import { zhCnMessages } from './zh-cn'
import { zhTwMessages } from './zh-tw'

export type AppLocale = 'en' | 'zh-CN' | 'zh-TW'

type LocalizedMessageShape<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? ReadonlyArray<LocalizedMessageShape<Item>>
    : T extends object
      ? { [Key in keyof T]: LocalizedMessageShape<T[Key]> }
      : T

export type AppMessages = LocalizedMessageShape<typeof enMessages>

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

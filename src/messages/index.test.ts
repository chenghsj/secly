import { describe, expect, it } from 'vitest'
import { defaultLocale, resolveLocale, translations } from './index'

describe('resolveLocale', () => {
  it('keeps supported locales unchanged', () => {
    expect(resolveLocale('en')).toBe('en')
    expect(resolveLocale('zh-CN')).toBe('zh-CN')
    expect(resolveLocale('zh-TW')).toBe('zh-TW')
  })

  it('falls back to the default locale when the input is unsupported', () => {
    expect(resolveLocale('ja')).toBe(defaultLocale)
    expect(resolveLocale(undefined)).toBe(defaultLocale)
  })
})

describe('translations', () => {
  it('provides core labels for every supported locale', () => {
    expect(translations.en.common.appDataRootLabel).toBeTruthy()
    expect(translations['zh-CN'].common.appDataRootLabel).toBeTruthy()
    expect(translations['zh-TW'].common.appDataRootLabel).toBeTruthy()
  })
})

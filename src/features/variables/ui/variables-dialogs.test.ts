// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSearchAndFocusInput } from './variables-dialogs'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('clearSearchAndFocusInput', () => {
  it('clears the current search and returns focus to the input', () => {
    const onClearSearch = vi.fn(() => {
      const input = document.getElementById(
        'global-entry-search-input',
      ) as HTMLInputElement | null

      if (input) {
        input.value = ''
      }
    })

    const input = document.createElement('input')
    input.id = 'global-entry-search-input'
    input.value = 'ad'
    document.body.appendChild(input)

    clearSearchAndFocusInput({
      inputId: input.id,
      onClearSearch,
    })

    expect(onClearSearch).toHaveBeenCalledTimes(1)
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
  })
})

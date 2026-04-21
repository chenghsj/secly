// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConnectGuestCardControls } from './connect-guest-card-controls'

vi.mock('./theme-switcher', () => ({
  ThemeSwitcher: () => <button type="button">theme-switcher</button>,
}))

vi.mock('./locale-switcher', () => ({
  LocaleSwitcher: () => <button type="button">locale-switcher</button>,
}))

describe('ConnectGuestCardControls', () => {
  it('renders the theme and locale controls for guest connect cards', () => {
    render(<ConnectGuestCardControls />)

    expect(screen.getByRole('button', { name: 'theme-switcher' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'locale-switcher' })).toBeDefined()
  })
})
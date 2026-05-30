import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

const isTest =
  process.env.NODE_ENV === 'test' || typeof process.env.VITEST !== 'undefined'

export default defineConfig(async () => {
  const plugins = [devtools(), tanstackStart(), viteReact()]

  if (!isTest) {
    const tailwindcss = await import('@tailwindcss/vite').then((m) => m.default)
    plugins.push(tailwindcss())
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins,
  }
})

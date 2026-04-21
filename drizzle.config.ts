import { defineConfig } from 'drizzle-kit'
import { getAppPaths } from './src/server/app-paths'

const paths = getAppPaths()

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: paths.databaseFile,
  },
  strict: true,
  verbose: true,
})

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { getAppPaths } from '../app-paths'
import * as schema from './schema'

const paths = getAppPaths()
const sqlite = new Database(paths.databaseFile)

export const db = drizzle(sqlite, { schema })

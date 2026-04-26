import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { ensureAppDirectories } from '../app-paths'
import * as schema from './schema'

const paths = ensureAppDirectories()
const sqlite = new Database(paths.databaseFile)

export const db = drizzle(sqlite, { schema })

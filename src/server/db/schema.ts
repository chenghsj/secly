import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const installMetadata = sqliteTable('install_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const githubSessions = sqliteTable('github_sessions', {
  id: text('id').primaryKey(),
  githubUserId: text('github_user_id').notNull(),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  expiresAt: text('expires_at'),
  locale: text('locale').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const connectedRepositories = sqliteTable('connected_repositories', {
  id: text('id').primaryKey(),
  ownerType: text('owner_type').notNull(),
  ownerLogin: text('owner_login').notNull(),
  repoId: text('repo_id').notNull(),
  repoName: text('repo_name').notNull(),
  fullName: text('full_name').notNull(),
  installationId: text('installation_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const cliSessions = sqliteTable('cli_sessions', {
  id: text('id').primaryKey(),
  lastLocale: text('last_locale').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

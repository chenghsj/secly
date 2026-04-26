import { db } from './client'
import { repositoryVariableLocks } from './schema'
import { eq, and, inArray } from 'drizzle-orm'

/**
 * Merge lock state from the local DB into a list of entries.
 * Also performs garbage collection: removes locks for entries
 * that no longer exist on GitHub.
 */
export function mergeLocksAndGarbageCollect<
  T extends { name: string },
>(
  entries: T[],
  {
    repository,
    scope,
    environmentName = '',
  }: {
    repository: string
    scope: string
    environmentName?: string
  },
): (T & { isLocked: boolean })[] {
  const locks = db
    .select()
    .from(repositoryVariableLocks)
    .where(
      and(
        eq(repositoryVariableLocks.repository, repository),
        eq(repositoryVariableLocks.scope, scope),
        eq(repositoryVariableLocks.environmentName, environmentName),
      ),
    )
    .all()

  const lockedNames = new Set(locks.map((l) => l.variableName))
  const entryNames = entries.map((e) => e.name)

  const orphanedLocks = locks.filter(
    (l) => !entryNames.includes(l.variableName),
  )

  if (orphanedLocks.length > 0) {
    const orphanedIds = orphanedLocks.map((l) => l.id)
    db.delete(repositoryVariableLocks)
      .where(inArray(repositoryVariableLocks.id, orphanedIds))
      .run()

    orphanedLocks.forEach((l) => lockedNames.delete(l.variableName))
  }

  return entries.map((entry) => ({
    ...entry,
    isLocked: lockedNames.has(entry.name),
  }))
}

import { describe, expect, it, vi } from 'vitest'
import { useVariablesRouteNavigation } from './use-variables-route-navigation'
import type { VariablesSearch } from '#/lib/variables-route-search'

function createNavigation() {
  const navigate = vi
    .fn<
      (options: {
        replace?: boolean
        resetScroll?: boolean
        search: (previous: VariablesSearch) => VariablesSearch
      }) => Promise<void>
    >()
    .mockResolvedValue(undefined)

  const navigation = useVariablesRouteNavigation({
    entrySortDirection: 'asc',
    entrySortField: 'name',
    navigate,
  })

  return {
    navigate,
    navigation,
  }
}

describe('useVariablesRouteNavigation', () => {
  it('merges search updates through navigate without replacing by default', async () => {
    const { navigate, navigation } = createNavigation()

    await navigation.updateVariablesSearch({
      environment: 'production',
      query: 'token',
    })

    expect(navigate).toHaveBeenCalledWith({
      replace: false,
      resetScroll: false,
      search: expect.any(Function),
    })

    const options = navigate.mock.calls[0]?.[0]
    expect(
      options?.search({
        repository: 'cheng/foo',
        scope: 'repository-secrets',
        sort: 'updated:desc',
      }),
    ).toEqual({
      environment: 'production',
      query: 'token',
      repository: 'cheng/foo',
      scope: 'repository-secrets',
      sort: 'updated:desc',
    })
  })

  it('normalizes search query updates with replace semantics', async () => {
    const { navigate, navigation } = createNavigation()

    await navigation.setEntrySearchQuery('')

    const options = navigate.mock.calls[0]?.[0]
    expect(options?.replace).toBe(true)
    expect(
      options?.search({
        query: 'stale',
        repository: 'cheng/foo',
      }),
    ).toEqual({
      query: undefined,
      repository: 'cheng/foo',
    })
  })

  it('toggles the current sort field direction', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined)
    const navigation = useVariablesRouteNavigation({
      entrySortDirection: 'asc',
      entrySortField: 'name',
      navigate,
    })

    await navigation.setEntrySort('name')

    const options = navigate.mock.calls[0]?.[0]
    expect(options?.replace).toBe(true)
    expect(options?.search({ repository: 'cheng/foo' })).toEqual({
      repository: 'cheng/foo',
      sort: 'name:desc',
    })
  })

  it('switches to the target field default direction when sorting a new field', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined)
    const navigation = useVariablesRouteNavigation({
      entrySortDirection: 'asc',
      entrySortField: 'name',
      navigate,
    })

    await navigation.setEntrySort('updated')

    const options = navigate.mock.calls[0]?.[0]
    expect(options?.search({ query: 'token' })).toEqual({
      query: 'token',
      sort: 'updated:desc',
    })
  })
})

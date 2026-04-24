import {
  getNextVariablesEntrySort,
  mergeVariablesSearchUpdate,
  type VariablesEntrySort,
  type VariablesEntrySortDirection,
  type VariablesEntrySortField,
  type VariablesSearch,
} from '#/lib/variables-route-search'

type NavigateVariablesSearch = (options: {
  replace?: boolean
  resetScroll?: boolean
  search: (previous: VariablesSearch) => VariablesSearch
}) => Promise<void>

export function useVariablesRouteNavigation({
  entrySortDirection,
  entrySortField,
  navigate,
}: {
  entrySortDirection: VariablesEntrySortDirection
  entrySortField: VariablesEntrySortField
  navigate: NavigateVariablesSearch
}) {
  async function updateVariablesSearch(
    nextValues: Partial<VariablesSearch>,
    { replace = false }: { replace?: boolean } = {},
  ) {
    await navigate({
      replace,
      resetScroll: false,
      search: (previous) => mergeVariablesSearchUpdate(previous, nextValues),
    })
  }

  function clearEntrySearch() {
    return updateVariablesSearch(
      {
        query: undefined,
      },
      {
        replace: true,
      },
    )
  }

  function setEntrySearchQuery(value: string) {
    return updateVariablesSearch(
      {
        query: value || undefined,
      },
      {
        replace: true,
      },
    )
  }

  function setEntryEditorTab(nextTab: 'single' | 'bulk') {
    return updateVariablesSearch(
      {
        tab: nextTab,
      },
      {
        replace: true,
      },
    )
  }

  function setEntrySort(field: VariablesEntrySortField) {
    const currentSort =
      `${entrySortField}:${entrySortDirection}` satisfies VariablesEntrySort

    return updateVariablesSearch(
      {
        sort: getNextVariablesEntrySort(currentSort, field),
      },
      {
        replace: true,
      },
    )
  }

  return {
    clearEntrySearch,
    navigate,
    setEntryEditorTab,
    setEntrySearchQuery,
    setEntrySort,
    updateVariablesSearch,
  }
}

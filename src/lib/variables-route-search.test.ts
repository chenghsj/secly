import { describe, expect, it } from 'vitest'
import {
  defaultVariablesEntrySort,
  getNextVariablesEntrySort,
  mergeVariablesSearchUpdate,
  validateVariablesSearch,
} from './variables-route-search'

describe('validateVariablesSearch', () => {
  it('drops empty query values from the URL search state', () => {
    expect(validateVariablesSearch({ query: '   ' })).toEqual({
      environment: undefined,
      query: undefined,
      repository: undefined,
      sort: undefined,
      scope: undefined,
      tab: undefined,
    })
  })

  it('drops legacy global query values from the URL search state', () => {
    expect(validateVariablesSearch({ globalQuery: 'deploy' })).toEqual({
      environment: undefined,
      query: undefined,
      repository: undefined,
      sort: undefined,
      scope: undefined,
      tab: undefined,
    })
  })

  it('keeps supported sort values and drops unsupported ones', () => {
    expect(validateVariablesSearch({ sort: 'updated:desc' })).toEqual({
      environment: undefined,
      query: undefined,
      repository: undefined,
      sort: 'updated:desc',
      scope: undefined,
      tab: undefined,
    })

    expect(validateVariablesSearch({ sort: 'updated:sideways' })).toEqual({
      environment: undefined,
      query: undefined,
      repository: undefined,
      sort: undefined,
      scope: undefined,
      tab: undefined,
    })
  })
})

describe('getNextVariablesEntrySort', () => {
  it('toggles the current field direction', () => {
    expect(getNextVariablesEntrySort('name:asc', 'name')).toBe('name:desc')
  })

  it('uses field-specific defaults when switching fields', () => {
    expect(
      getNextVariablesEntrySort(defaultVariablesEntrySort, 'updated'),
    ).toBe('updated:desc')
    expect(getNextVariablesEntrySort('updated:desc', 'value')).toBe('value:asc')
  })
})

describe('mergeVariablesSearchUpdate', () => {
  it('clears query when it is explicitly set to undefined', () => {
    expect(
      mergeVariablesSearchUpdate(
        {
          query: 'a',
          repository: 'cheng/foo',
          sort: 'name:asc',
          scope: 'repository-secrets',
          tab: 'single',
        },
        {
          query: undefined,
        },
      ),
    ).toEqual({
      query: undefined,
      repository: 'cheng/foo',
      sort: 'name:asc',
      scope: 'repository-secrets',
      tab: 'single',
    })
  })

  it('preserves query when no query update was provided', () => {
    expect(
      mergeVariablesSearchUpdate(
        {
          query: 'token',
          repository: 'cheng/foo',
          sort: 'updated:desc',
          scope: 'repository-secrets',
          tab: 'single',
        },
        {
          tab: 'bulk',
        },
      ),
    ).toEqual({
      query: 'token',
      repository: 'cheng/foo',
      sort: 'updated:desc',
      scope: 'repository-secrets',
      tab: 'bulk',
    })
  })

  it('clears other optional URL search fields when explicitly unset', () => {
    expect(
      mergeVariablesSearchUpdate(
        {
          environment: 'copilot',
          query: 'token',
          repository: 'cheng/foo',
          sort: 'name:desc',
          scope: 'environment-secrets',
          tab: 'single',
        },
        {
          environment: undefined,
          repository: undefined,
        },
      ),
    ).toEqual({
      environment: undefined,
      query: 'token',
      repository: undefined,
      sort: 'name:desc',
      scope: 'environment-secrets',
      tab: 'single',
    })
  })

  it('clears sort when it is explicitly set to undefined', () => {
    expect(
      mergeVariablesSearchUpdate(
        {
          query: 'repo',
          repository: 'cheng/foo',
          sort: 'updated:desc',
          scope: 'repository-variables',
          tab: 'single',
        },
        {
          sort: undefined,
        },
      ),
    ).toEqual({
      query: 'repo',
      repository: 'cheng/foo',
      sort: undefined,
      scope: 'repository-variables',
      tab: 'single',
    })
  })
})

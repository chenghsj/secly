import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type {
  VariablesLoaderData,
  VariablesPageDataSnapshot,
} from '#/features/variables/domain/variables-types'
import {
  createVariablesEditorActions,
  createVariablesEditorState,
  createVariablesResourceActions,
  createVariablesResourceState,
  createVariablesUiActions,
  createVariablesUiState,
  type VariablesStore,
  type VariablesStoreState,
} from './variables-store-slices'

export type {
  VariablesStore,
  VariablesStoreState,
} from './variables-store-slices'

type VariablesStoreContextValue = ReturnType<typeof createVariablesStore>

export function createVariablesStoreInitialState({
  initialDataSnapshot,
  loaderData,
}: {
  initialDataSnapshot: VariablesPageDataSnapshot | null
  loaderData: VariablesLoaderData
}): VariablesStoreState {
  return {
    ...createVariablesResourceState({
      initialDataSnapshot,
      loaderData,
    }),
    ...createVariablesEditorState(),
    ...createVariablesUiState(),
  }
}

export function createVariablesStore(initialState: VariablesStoreState) {
  return createStore<VariablesStore>()((set, get) => ({
    ...initialState,
    ...createVariablesResourceActions(set),
    ...createVariablesEditorActions(set, get),
    ...createVariablesUiActions(set),
    resetRepositoryScopedData: () => {
      get().clearGlobalSearchData()
      set(() => ({
        globalSearchQuery: '',
        repositoryVariables: [],
        repositoryVariablesRepository: '',
        repositorySecrets: [],
        repositorySecretsRepository: '',
        environments: [],
        environmentsRepository: '',
        environmentVariables: [],
        environmentVariablesKey: '',
        environmentSecrets: [],
        environmentSecretsKey: '',
      }))
    },
  }))
}

const VariablesStoreContext = createContext<VariablesStoreContextValue | null>(
  null,
)

export function VariablesStoreProvider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState: VariablesStoreState
}) {
  const storeRef = useRef<VariablesStoreContextValue | null>(null)

  if (storeRef.current === null) {
    storeRef.current = createVariablesStore(initialState)
  }

  return (
    <VariablesStoreContext.Provider value={storeRef.current}>
      {children}
    </VariablesStoreContext.Provider>
  )
}

export function useVariablesStore<Selected>(
  selector: (state: VariablesStore) => Selected,
) {
  const store = useContext(VariablesStoreContext)

  if (store === null) {
    throw new Error(
      'useVariablesStore must be used within VariablesStoreProvider.',
    )
  }

  return useStore(store, selector)
}

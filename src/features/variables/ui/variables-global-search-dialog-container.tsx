import type { AppLocale } from '#/messages'
import type {
  GlobalSearchResult,
  VariablesMessages,
} from '#/features/variables/domain/variables-types'
import {
  VariablesGlobalSearchDialog,
  type VariablesGlobalSearchDialogProps,
} from './variables-dialogs'

export type VariablesGlobalSearchDialogContainerProps = {
  actions: VariablesGlobalSearchDialogProps['actions']
  filteredResults: GlobalSearchResult[]
  globalSearchError: string | null
  globalSearchInputId: string
  globalSearchQuery: string
  isGlobalSearchDialogOpen: boolean
  isGlobalSearchLoading: boolean
  locale: AppLocale
  selectedRepository: string
  trimmedGlobalSearchQuery: string
  variablesMessages: VariablesMessages
}

export function VariablesGlobalSearchDialogContainer({
  actions,
  filteredResults,
  globalSearchError,
  globalSearchInputId,
  globalSearchQuery,
  isGlobalSearchDialogOpen,
  isGlobalSearchLoading,
  locale,
  selectedRepository,
  trimmedGlobalSearchQuery,
  variablesMessages,
}: VariablesGlobalSearchDialogContainerProps) {
  return (
    <VariablesGlobalSearchDialog
      actions={actions}
      content={{
        locale,
      }}
      state={{
        filteredResults,
        globalSearchError,
        globalSearchInputId,
        globalSearchQuery,
        isGlobalSearchDialogOpen,
        isGlobalSearchLoading,
        selectedRepository,
        trimmedGlobalSearchQuery,
      }}
      variablesMessages={variablesMessages}
    />
  )
}

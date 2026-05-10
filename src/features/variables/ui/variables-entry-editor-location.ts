import type { SettingsScope } from '#/lib/variables-route-search'
import type { VariablesMessages } from '#/features/variables/domain/variables-types'
import {
  getScopeConfig,
  isEnvironmentScope,
} from '#/features/variables/models/variables-helpers'

export function getEntryEditorLocationItems({
  entryEditorEnvironment,
  entryEditorRepository,
  entryEditorScope,
  variablesMessages,
}: {
  entryEditorEnvironment: string
  entryEditorRepository: string
  entryEditorScope: SettingsScope
  variablesMessages: VariablesMessages
}) {
  const scopeConfig = getScopeConfig(variablesMessages, entryEditorScope)
  const items = [
    {
      label: variablesMessages.repositoryLabel,
      value:
        entryEditorRepository ||
        variablesMessages.editorLocationMissingRepository,
    },
  ]

  if (isEnvironmentScope(entryEditorScope)) {
    items.push({
      label: variablesMessages.environmentLabel,
      value:
        entryEditorEnvironment ||
        variablesMessages.editorLocationMissingEnvironment,
    })
  }

  items.push({
    label: variablesMessages.scopeLabel,
    value: scopeConfig.title,
  })

  return items
}

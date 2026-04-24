import { useEffect } from 'react'

function focusAndSelectInput(targetId: string) {
  const target = document.getElementById(targetId)

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    target.focus()
    target.select()
  }
}

export function useVariablesRouteFocusManagement({
  bulkInputId,
  entryEditorNeedsEnvironmentSelection,
  entryEditorRepository,
  entryNameInputId,
  entryValueInputId,
  globalSearchInputId,
  isBulkEditorActive,
  isEntryEditorOpen,
  isGlobalSearchDialogOpen,
  isSingleEntryEditor,
}: {
  bulkInputId: string
  entryEditorNeedsEnvironmentSelection: boolean
  entryEditorRepository: string
  entryNameInputId: string
  entryValueInputId: string
  globalSearchInputId: string
  isBulkEditorActive: boolean
  isEntryEditorOpen: boolean
  isGlobalSearchDialogOpen: boolean
  isSingleEntryEditor: boolean
}) {
  useEffect(() => {
    if (
      !isEntryEditorOpen ||
      !entryEditorRepository ||
      entryEditorNeedsEnvironmentSelection
    ) {
      return
    }

    const targetInputId = isBulkEditorActive
      ? bulkInputId
      : isSingleEntryEditor
        ? entryValueInputId
        : entryNameInputId

    const frameId = window.requestAnimationFrame(() => {
      focusAndSelectInput(targetInputId)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [
    bulkInputId,
    entryEditorNeedsEnvironmentSelection,
    entryEditorRepository,
    entryNameInputId,
    entryValueInputId,
    isBulkEditorActive,
    isEntryEditorOpen,
    isSingleEntryEditor,
  ])

  useEffect(() => {
    if (!isGlobalSearchDialogOpen) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      focusAndSelectInput(globalSearchInputId)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [globalSearchInputId, isGlobalSearchDialogOpen])
}

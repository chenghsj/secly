import { describe, expect, it } from 'vitest'
import {
  shouldDisableEntryEditorDismiss,
  shouldDisableEntryEditorTabChange,
} from './variables-entry-editor-dialog'

describe('shouldDisableEntryEditorTabChange', () => {
  it('disables tab changes while a single-entry save is in flight', () => {
    expect(
      shouldDisableEntryEditorTabChange({
        isBulkSaving: false,
        isSaving: true,
      }),
    ).toBe(true)
  })

  it('disables tab changes while a bulk save is in flight', () => {
    expect(
      shouldDisableEntryEditorTabChange({
        isBulkSaving: true,
        isSaving: false,
      }),
    ).toBe(true)
  })

  it('keeps tab changes enabled while the editor is idle', () => {
    expect(
      shouldDisableEntryEditorTabChange({
        isBulkSaving: false,
        isSaving: false,
      }),
    ).toBe(false)
  })
})

describe('shouldDisableEntryEditorDismiss', () => {
  it('disables dismiss actions while a single-entry save is in flight', () => {
    expect(
      shouldDisableEntryEditorDismiss({
        isBulkSaving: false,
        isSaving: true,
      }),
    ).toBe(true)
  })

  it('disables dismiss actions while a bulk save is in flight', () => {
    expect(
      shouldDisableEntryEditorDismiss({
        isBulkSaving: true,
        isSaving: false,
      }),
    ).toBe(true)
  })

  it('keeps dismiss actions enabled while the editor is idle', () => {
    expect(
      shouldDisableEntryEditorDismiss({
        isBulkSaving: false,
        isSaving: false,
      }),
    ).toBe(false)
  })
})

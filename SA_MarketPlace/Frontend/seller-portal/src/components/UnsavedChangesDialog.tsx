import { useState } from 'react'
import type { Blocker } from 'react-router'
import SADialog, { SADialogPoints, SADialogSection } from 'src/components/SADialog'

interface Props {
  /** From `useUnsavedChanges`; the dialog shows while it is blocked. */
  blocker: Blocker
  /** Saves what the page holds. True when it worked, so the seller can go on; false keeps them here to fix it. */
  onSave: () => Promise<boolean>
  saveLabel?: string
}

// "Save your changes?" for a page left with edits: keep editing, leave without saving, or save and go.
const UnsavedChangesDialog = ({ blocker, onSave, saveLabel = 'Save changes' }: Props) => {
  const [saving, setSaving] = useState(false)
  if (blocker.state !== 'blocked') return null

  const stay = () => blocker.reset()
  const save = async () => {
    setSaving(true)
    const saved = await onSave()
    setSaving(false)
    if (saved) blocker.proceed()
    else blocker.reset()
  }

  return (
    <SADialog
      tone="warning"
      title="Save your changes?"
      summary="You have changes on this page that are not saved yet."
      onCancel={stay}
      actions={[
        { key: 'stay', label: 'Keep editing', onClick: stay, disabled: saving },
        { key: 'discard', label: 'Discard changes', kind: 'danger-outline', onClick: () => blocker.proceed(), disabled: saving },
        { key: 'save', label: saveLabel, kind: 'primary', loading: saving, onClick: save },
      ]}
    >
      <SADialogSection title="If you leave without saving">
        <SADialogPoints kind="remove" points={[{ title: 'Your changes are lost.', detail: 'Anything you edited since you last saved is not kept.' }]} />
      </SADialogSection>
      <SADialogSection title="If you save first">
        <SADialogPoints kind="keep" points={[{ title: 'Your changes are saved.', detail: 'Then you go on to where you were heading.' }]} />
      </SADialogSection>
    </SADialog>
  )
}

export default UnsavedChangesDialog

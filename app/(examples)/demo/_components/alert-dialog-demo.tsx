'use client'

import { AlertDialog } from '@/components/ui/alert-dialog'

export function AlertDialogDemo() {
  return (
    <div className="flex gap-4">
      <AlertDialog
        trigger={
          <button
            type="button"
            className="dr-rounded-8 dr-px-16 dr-py-10 bg-white/10 hover:bg-white/20"
          >
            Confirm Action
          </button>
        }
        title="Are you sure?"
        description="This action will save your changes and cannot be undone."
        confirmLabel="Save"
        onConfirm={() => console.log('Confirmed!')}
      />

      <AlertDialog
        trigger={
          <button
            type="button"
            className="dr-rounded-8 dr-px-16 dr-py-10 bg-red-500/20 text-red-400 hover:bg-red-500/30"
          >
            Delete Item
          </button>
        }
        title="Delete this item?"
        description="This will permanently delete the item. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => console.log('Deleted!')}
      />
    </div>
  )
}

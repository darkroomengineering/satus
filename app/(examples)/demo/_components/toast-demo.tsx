'use client'

import { useToast } from '~/components/ui/toast'

export function ToastDemo() {
  const { toast } = useToast()

  return (
    <div className="flex flex-wrap gap-4">
      <button
        type="button"
        className="dr-rounded-8 bg-white/10 dr-px-16 dr-py-10 hover:bg-white/20"
        onClick={() => toast('Default notification')}
      >
        Default
      </button>

      <button
        type="button"
        className="dr-rounded-8 bg-green-500/20 text-green-400 dr-px-16 dr-py-10 hover:bg-green-500/30"
        onClick={() => toast.success('Successfully saved!')}
      >
        Success
      </button>

      <button
        type="button"
        className="dr-rounded-8 bg-red-500/20 text-red-400 dr-px-16 dr-py-10 hover:bg-red-500/30"
        onClick={() => toast.error('Something went wrong')}
      >
        Error
      </button>

      <button
        type="button"
        className="dr-rounded-8 bg-blue-500/20 text-blue-400 dr-px-16 dr-py-10 hover:bg-blue-500/30"
        onClick={() => toast.info('Just so you know...')}
      >
        Info
      </button>
    </div>
  )
}

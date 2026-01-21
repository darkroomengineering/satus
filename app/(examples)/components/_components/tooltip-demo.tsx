'use client'

import { Tooltip } from '@/components/ui/tooltip'

export function TooltipDemo() {
  return (
    <div className="flex gap-4">
      <Tooltip content="This appears on top" side="top">
        <button
          type="button"
          className="dr-rounded-8 dr-px-16 dr-py-10 bg-white/10 hover:bg-white/20"
        >
          Top
        </button>
      </Tooltip>

      <Tooltip content="This appears on the right" side="right">
        <button
          type="button"
          className="dr-rounded-8 dr-px-16 dr-py-10 bg-white/10 hover:bg-white/20"
        >
          Right
        </button>
      </Tooltip>

      <Tooltip content="This appears on the bottom" side="bottom">
        <button
          type="button"
          className="dr-rounded-8 dr-px-16 dr-py-10 bg-white/10 hover:bg-white/20"
        >
          Bottom
        </button>
      </Tooltip>

      <Tooltip content="This appears on the left" side="left">
        <button
          type="button"
          className="dr-rounded-8 dr-px-16 dr-py-10 bg-white/10 hover:bg-white/20"
        >
          Left
        </button>
      </Tooltip>
    </div>
  )
}

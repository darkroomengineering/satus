'use client'

import type { TransitionType } from '~/components/layout/page-transition'
import { TransitionLink } from '~/components/layout/page-transition'

const transitionTypes: TransitionType[] = [
  'fade',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'reveal',
]

export function TransitionDemo() {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {transitionTypes.map((type) => (
        <TransitionLink
          key={type}
          href={`/transitions/${type}`}
          exitType={type}
          duration={0.6}
          className="dr-rounded-8 dr-px-16 dr-py-12 border border-white/20 bg-white/5 transition-colors hover:bg-white/10"
        >
          {type}
        </TransitionLink>
      ))}
    </div>
  )
}

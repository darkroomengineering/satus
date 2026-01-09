'use client'

import type { TransitionType } from '~/components/layout/page-transition'
import { TransitionLink } from '~/components/layout/page-transition'

interface BackLinkProps {
  transitionType: string
}

export function BackLink({ transitionType }: BackLinkProps) {
  // Mirror the transition: slide-left becomes slide-right, etc.
  const getExitType = (type: string): TransitionType => {
    switch (type) {
      case 'slide-left':
        return 'slide-right'
      case 'slide-right':
        return 'slide-left'
      case 'slide-up':
        return 'slide-down'
      case 'slide-down':
        return 'slide-up'
      default:
        return type as TransitionType
    }
  }

  return (
    <TransitionLink
      href="/transitions"
      exitType={getExitType(transitionType)}
      duration={0.6}
      className="dr-rounded-8 dr-px-24 dr-py-16 inline-block border border-white/30 bg-white/10 transition-colors hover:bg-white/20"
    >
      Back to Transitions
    </TransitionLink>
  )
}

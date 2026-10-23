import cn from 'clsx'

import { Image } from '@/webgl/components/image'

import testPattern from './test-pattern.webp'

interface TestPatternProps {
  className?: string | undefined
}

/**
 * A 2048px aliasing test pattern (zone plate plus fine-line corner patches)
 * drawn as a WebGL plane. Shrunk, it reads as gray when the texture is
 * filtered well and breaks into moiré when it isn't.
 */
export function TestPattern({ className }: TestPatternProps) {
  return (
    <Image
      src={testPattern}
      alt="Zone plate and fine line test pattern"
      // The texture is the file the DOM image loaded. Optimized, Next would
      // serve a near-display-size candidate and the GPU would have nothing to
      // shrink. `sizes` is required by the type and unused without a srcset.
      unoptimized
      sizes="25vw"
      fill
      className={cn('aspect-square', className)}
    />
  )
}

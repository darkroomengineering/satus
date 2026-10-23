import cn from 'clsx'

import { Image } from '@/webgl/components/image'

import testPattern from './test-pattern.webp'

interface TestPatternProps {
  /** Sizes and places the image: any width, any layout. */
  className?: string | undefined
}

/**
 * A 2048px aliasing test pattern drawn as a WebGL plane: a zone plate whose
 * rings tighten to 1 cycle per 2 px at its edges, and corner patches of 1px
 * lines, 1px checker and 2px diagonals. Drawn smaller than its source, every
 * part of it is finer than the screen can show, so it reads as gray when the
 * texture is filtered well and breaks into moiré when it isn't.
 */
export function TestPattern({ className }: TestPatternProps) {
  return (
    <Image
      src={testPattern}
      alt="Zone plate and fine line test pattern"
      // The plane's texture is the file the DOM image loaded. Optimized, Next
      // would serve a candidate near the display size and the GPU would have
      // nothing to shrink, so the full 2048px file is served as is. `sizes`
      // is required by the type and unused without a srcset.
      unoptimized
      sizes="25vw"
      fill
      className={cn('aspect-square', className)}
    />
  )
}

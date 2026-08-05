import { describe, expect, test } from 'bun:test'

import { Image } from './index'

describe('Image sizing props', () => {
  // Regression test for issue #393: `block` used to sit on the flat prop
  // intersection outside `ImageSizingProps`, so a caller could pass
  // `width`/`height` (non-fill sizing) together with `block={false}`. That
  // combination typechecked and then threw at runtime from next/image
  // ("has both width and fill properties") because `block={false}` flipped
  // the derived `fill` prop to `true` while `width`/`height` were still
  // spread in. `block` no longer exists as a prop — `fill` is read straight
  // from the sizing union — so the same call site must fail to typecheck.
  test('block cannot escape the sizing union and flip fill', () => {
    function invalidUsage() {
      return (
        <Image
          src="/foo.jpg"
          alt=""
          width={800}
          height={600}
          mobileSize="50vw"
          desktopSize="30vw"
          // @ts-expect-error -- `block` is not a prop of Image (issue #393)
          block={false}
        />
      )
    }

    expect(typeof invalidUsage).toBe('function')
  })
})

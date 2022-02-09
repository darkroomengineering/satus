// https://medium.com/swlh/bring-vue-named-slots-to-react-87684188f18e

import { useMemo } from 'react'

export const useSlots = (types = [], children = []) => {
  const _children = useMemo(() => children && [children].flat(), [children])
  const _types = useMemo(() => types && [types].flat(), [types])
  const slots = useMemo(
    () =>
      _children &&
      _types &&
      _types.map(
        (type) => _children.find((el) => el.type === type)?.props.children
      ),
    [_children, _types]
  )

  return types[0] ? slots : slots[0]
}

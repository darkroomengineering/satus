/* eslint-disable no-restricted-imports */
import { useEffect, useLayoutEffect as vanillaUseLayoutEffect } from 'react'

export const useLayoutEffect =
  typeof window !== 'undefined' ? vanillaUseLayoutEffect : useEffect

export default useLayoutEffect

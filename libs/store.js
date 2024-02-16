import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'

export const useStore = createWithEqualityFn(
  (set) => ({
    isNavOpened: false,
    setIsNavOpened: (value) => set({ isNavOpened: value }),
    hasPastPrefooter: false,
    setHasPastPrefooter: (value) => set({ hasPastPrefooter: value }),
    footerHeight: 0,
    setFooterHeight: (value) => set({ footerHeight: value }),
  }),
  shallow,
)

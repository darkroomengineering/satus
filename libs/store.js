import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'

export const useStore = createWithEqualityFn(
  (set) => ({
    navIsOpened: false,
    setNavIsOpened: (value) => set({ navIsOpened: value }),
  }),
  shallow,
)

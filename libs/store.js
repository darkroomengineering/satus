import { shallow } from 'zustand/shallow'
import { createWithEqualityFn } from 'zustand/traditional'

export const useStore = createWithEqualityFn(
  (set) => ({
    headerData: undefined,
    setHeaderData: (headerData) => set({ headerData }),
    footerData: undefined,
    setFooterData: (footerData) => set({ footerData }),
    navIsOpened: false,
    setNavIsOpened: (value) => set({ navIsOpened: value }),
    triggerTransition: false,
    setTriggerTransition: (triggerTransition) => set({ triggerTransition }),
  }),
  shallow,
)

import { create } from 'zustand'

export const useStore = create((set) => ({
  headerData: undefined,
  setHeaderData: (headerData) => set({ headerData }),
  footerData: undefined,
  setFooterData: (footerData) => set({ footerData }),
  navIsOpened: false,
  setNavIsOpened: (value) => set({ navIsOpened: value }),
  triggerTransition: false,
  setTriggerTransition: (triggerTransition) => set({ triggerTransition }),
}))

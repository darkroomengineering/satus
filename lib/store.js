import create from 'zustand'

export const useStore = create((set) => ({
  navIsOpen: false,
  setNavIsOpen: (toggle) => set({ navIsOpen: toggle, overflow: !toggle }),
  lenis: undefined,
  setLenis: (lenis) => set({ lenis }),
  overflow: true,
  setOverflow: (overflow) => set({ overflow }),
  headerData: undefined,
  setHeaderData: (headerData) => set((state) => ({ headerData })),
  footerData: undefined,
  setFooterData: (footerData) => set((state) => ({ footerData })),
}))

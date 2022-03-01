import create from 'zustand'

export const useStore = create((set) => ({
  navIsOpen: false,
  setNavIsOpen: (toggle) =>
    set((state) => {
      document.documentElement.classList.toggle('nav', toggle)

      const locomotive = state.locomotive

      if (toggle) {
        locomotive?.stop()
      } else {
        locomotive?.start()
      }

      return {
        navIsOpen: toggle,
      }
    }),
  locomotive: undefined,
  setLocomotive: (locomotive) => set((state) => ({ locomotive })),
  headerData: undefined,
  setHeaderData: (headerData) => set((state) => ({ headerData })),
  footerData: undefined,
  setFooterData: (footerData) => set((state) => ({ footerData })),
}))

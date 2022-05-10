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
  lenis: undefined,
  setLenis: (lenis) => set((state) => ({ lenis })),
}))

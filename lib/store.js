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
  toggleCart: undefined,
  setToggleCart: (toggleCart) => set((state) => ({ toggleCart })),
  isDebouncing: false,
  setIsDebouncing: (isDebouncing) => set((state) => ({ isDebouncing })),
}))

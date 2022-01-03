import create from 'zustand'

export const useStore = create((set) => ({
  navIsOpen: false,
  setNavIsOpen: (toggle) =>
    set((state) => {
      document.documentElement.classList.toggle('nav', toggle)

      return {
        navIsOpen: toggle,
      }
    }),
  locomotive: undefined,
  setLocomotive: (locomotive) => set((state) => ({ locomotive })),
}))

import create from 'zustand'

export const useStore = create((set) => ({
  navIsOpen: false,
  toggleNav: (toggle) => set((state) => ({ navIsOpen: !state.navIsOpen })),
  setNavIsOpen: (toggle) => set((state) => ({ navIsOpen: toggle })),
}))

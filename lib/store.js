import create from 'zustand'

export const useStore = create((set) => ({
  navIsOpen: false,
  setNavIsOpen: (toggle) => set({ navIsOpen: toggle, overflow: !toggle }),
  lenis: undefined,
  setLenis: (lenis) => set({ lenis }),
  overflow: true,
  setOverflow: (overflow) => set({ overflow }),
  toggleCart: undefined,
  setToggleCart: (toggleCart) => set((state) => ({ toggleCart })),
  isDebouncing: false,
  setIsDebouncing: (isDebouncing) => set((state) => ({ isDebouncing })),
}))

import { create } from 'zustand'

export const useStore = create((set) => ({
  isNavOpened: false,
  setIsNavOpened: (value) => set({ isNavOpened: value }),
}))

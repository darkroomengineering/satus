import { create } from 'zustand'

export const useStore = create((set) => ({
  isNavOpened: false,
  setIsNavOpened: (value: boolean) => set({ isNavOpened: value }),
}))

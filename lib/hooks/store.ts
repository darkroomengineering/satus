import { create } from 'zustand'

type Store = {
  isNavOpened: boolean
  setIsNavOpened: (value: boolean) => void
}

export const useStore = create<Store>((set) => ({
  isNavOpened: false,
  setIsNavOpened: (value: boolean) => set({ isNavOpened: value }),
}))

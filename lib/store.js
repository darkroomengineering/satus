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
  scroll: undefined,
  setScroll: (scroll) => set((state) => ({ scroll })),
  theme: undefined,
  setTheme: (theme) =>
    set((state) => {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add(theme)
      return { theme }
    }),
}))

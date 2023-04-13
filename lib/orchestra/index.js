import { broadcast } from 'lib/zustand-broadcast'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import s from './orchestra.module.scss'

export const useOrchestra = create(
  persist(
    () => ({
      theatreList: {},
      stats: false,
      grid: false,
    }),
    {
      name: 'orchestra',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

broadcast(useOrchestra, 'orchestra')

export function Orchestra() {
  return (
    <div className={s.orchestra}>
      <button
        onClick={() => {
          window.open('/_debug/theatre', null, {})
        }}
      >
        ⚙️
      </button>
      <button
        onClick={() => {
          useOrchestra.setState(({ stats }) => ({ stats: !stats }))
        }}
      >
        📈
      </button>
      <button
        onClick={() => {
          useOrchestra.setState(({ grid }) => ({ grid: !grid }))
        }}
      >
        🌐
      </button>
    </div>
  )
}

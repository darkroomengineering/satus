'use client'

import { useLayoutEffect, useState } from 'react'
import { BackgroundContext } from '.'

export function BackgroundProvider({ children, audioList }) {
  const [loadedList, setLoadedList] = useState([])

  useLayoutEffect(() => {
    async function load() {
      const list = await Promise.all(
        audioList.map(async (url) => {
          if (url.includes('//assets.tina.io')) {
            url = `/cms/${url.split('/').at(-1)}`
          }

          try {
            const res = await fetch(url)
            return await res.json()
          } catch (e) {
            console.log(e)
          }

          return null
        }),
      )

      setLoadedList(list)
    }

    load()
  }, [audioList])

  return (
    <BackgroundContext.Provider value={{ audioList: loadedList }}>
      {children}
    </BackgroundContext.Provider>
  )
}

'use client'

// https://www.storyblok.com/docs/Guides/storyblok-latest-js?utm_source=github.com&utm_medium=readme&utm_campaign=storyblok-js

import { useRouter, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'

export const StoryblokContext = createContext({})

export function useStoryblokContext() {
  return useContext(StoryblokContext)
}

const BRIDGE_URL = '//app.storyblok.com/f/storyblok-v2-latest.js'

function StoryblokBridge({ onLoad }) {
  const searchParams = useSearchParams()
  const isLiveEditing = searchParams.has('_storyblok')

  return (
    isLiveEditing && (
      <Script
        src={BRIDGE_URL}
        type="text/javascript"
        onLoad={onLoad}
        strategy="afterInteractive"
      />
    )
  )
}

export function StoryblokContextProvider({ story, options, children }) {
  const id = story.id

  const [liveStory, setLiveStory] = useState(story)

  const router = useRouter()

  const onLoad = useCallback(() => {
    const bridge = new window.StoryblokBridge({ options })

    bridge.on(['input'], ({ story }) => {
      if (story.id === id) {
        setLiveStory(story)
      }
    })

    bridge.on(['published', 'change'], () => {
      router.refresh()
    })
  }, [router, id, options])

  return (
    <>
      <Suspense>
        <StoryblokBridge onLoad={onLoad} />
      </Suspense>
      <StoryblokContext.Provider value={{ story: liveStory }}>
        {children}
      </StoryblokContext.Provider>
    </>
  )
}

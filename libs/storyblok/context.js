'use client'

// https://www.storyblok.com/docs/Guides/storyblok-latest-js?utm_source=github.com&utm_medium=readme&utm_campaign=storyblok-js

import Script from 'next/script'
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'
import { useIsVisualEditor } from './use-is-visual-editor'

export const StoryblokContext = createContext({})

export function useStoryblokContext() {
  return useContext(StoryblokContext)
}

const BRIDGE_URL = '//app.storyblok.com/f/storyblok-v2-latest.js'

function StoryblokBridge({ onLoad }) {
  const isVisualEditor = useIsVisualEditor()

  // console.log('isVisualEditor', isVisualEditor)

  return (
    isVisualEditor && (
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

  const onLoad = useCallback(() => {
    // console.log('StoryblokBridge loaded')
    const bridge = new window.StoryblokBridge({ options })

    bridge.on(['input'], ({ story }) => {
      // console.log('input', story)
      if (story.id === id) {
        setLiveStory(story)
      }
    })
  }, [id, options])

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

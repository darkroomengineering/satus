'use client'

// https://www.storyblok.com/docs/Guides/storyblok-latest-js?utm_source=github.com&utm_medium=readme&utm_campaign=storyblok-js

import type { ISbStoryData, StoryblokBridgeConfigV2 } from '@storyblok/js'
import Script, { type ScriptProps } from 'next/script'
import {
  type PropsWithChildren,
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

function StoryblokBridge({ onLoad }: { onLoad: ScriptProps['onLoad'] }) {
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

type StoryblokContextProviderProps = {
  story: ISbStoryData
  options: StoryblokBridgeConfigV2
}

export function StoryblokContextProvider({
  story,
  options,
  children,
}: PropsWithChildren<StoryblokContextProviderProps>) {
  const id = story.id

  const [liveStory, setLiveStory] = useState(story)

  const onLoad = useCallback(() => {
    // console.log('StoryblokBridge loaded')
    const bridge = new window.StoryblokBridge(options)

    bridge.on('input', (payload) => {
      if (!payload) return
      // console.log('input', story)
      if (payload.story?.id === id) {
        setLiveStory(payload.story)
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

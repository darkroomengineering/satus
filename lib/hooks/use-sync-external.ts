'use client'

/* oxlint-disable hamo/no-raw-observer -- useSyncExternalStore subscribe/snapshot; no hamo equivalent */

import { useSyncExternalStore } from 'react'

// Server snapshots are the SSR/hydration defaults: online, light, no reduced
// motion, visible.

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineStatusSnapshot() {
  return navigator.onLine
}

function getOnlineStatusServerSnapshot() {
  return true
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatusSnapshot,
    getOnlineStatusServerSnapshot
  )
}

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

function subscribeToColorScheme(callback: () => void) {
  const mql = window.matchMedia(COLOR_SCHEME_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getColorSchemeSnapshot(): 'light' | 'dark' {
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? 'dark' : 'light'
}

function getColorSchemeServerSnapshot(): 'light' | 'dark' {
  return 'light'
}

export function usePreferredColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribeToColorScheme,
    getColorSchemeSnapshot,
    getColorSchemeServerSnapshot
  )
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeToReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function getReducedMotionServerSnapshot(): boolean {
  return false
}

export function usePreferredReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  )
}

function subscribeToVisibility(callback: () => void) {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

function getVisibilitySnapshot(): DocumentVisibilityState {
  return document.visibilityState
}

function getVisibilityServerSnapshot(): DocumentVisibilityState {
  return 'visible'
}

export function useDocumentVisibility(): DocumentVisibilityState {
  return useSyncExternalStore(
    subscribeToVisibility,
    getVisibilitySnapshot,
    getVisibilityServerSnapshot
  )
}

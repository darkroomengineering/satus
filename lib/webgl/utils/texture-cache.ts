'use client'

/**
 * Texture Cache System
 *
 * Module-level cache for Three.js textures to prevent duplicate loading.
 * Per Three.js Tip 40: Reuse textures across materials to reduce memory usage.
 *
 * Benefits:
 * - Prevents duplicate texture loads for the same URL
 * - Automatic memory management with dispose functions
 * - Optimized default settings for UI textures (no mipmaps, linear filter)
 *
 * @example
 * ```tsx
 * // Load a texture (returns cached instance if already loaded)
 * const texture = await loadCachedTexture('/hero.jpg')
 *
 * // Same URL returns the same texture instance
 * const texture2 = await loadCachedTexture('/hero.jpg')
 * console.log(texture === texture2) // true
 *
 * // Clean up when done
 * disposeTextureFromCache('/hero.jpg')
 *
 * // Or clear all textures
 * clearTextureCache()
 * ```
 */

import { useEffect, useRef, useState } from 'react'
import { LinearFilter, type Texture, TextureLoader } from 'three'

/**
 * Options for loading cached textures.
 */
export interface CachedTextureOptions {
  /**
   * Generate mipmaps for the texture.
   * Set to false for UI textures to save memory.
   * @default false
   */
  generateMipmaps?: boolean
  /**
   * Minification filter. LinearFilter is faster without mipmaps.
   * @default LinearFilter
   */
  minFilter?: typeof LinearFilter
  /**
   * Magnification filter.
   * @default LinearFilter
   */
  magFilter?: typeof LinearFilter
  /**
   * Flip the texture vertically on load.
   * @default true
   */
  flipY?: boolean
}

/**
 * Module-level cache for textures.
 * Maps URL strings to loaded Texture instances.
 */
const textureCache = new Map<string, Texture>()

/**
 * Pending loads to prevent duplicate requests.
 * Maps URL strings to loading Promises.
 */
const pendingLoads = new Map<string, Promise<Texture>>()

/**
 * Shared TextureLoader instance.
 */
let loader: TextureLoader | null = null

/**
 * Get or create the shared TextureLoader.
 */
function getLoader(): TextureLoader {
  if (!loader) {
    loader = new TextureLoader()
  }
  return loader
}

/**
 * Load a texture with caching support.
 *
 * Returns a cached texture if already loaded, otherwise loads and caches it.
 * Concurrent requests for the same URL share a single load operation.
 *
 * Per Three.js Tip 40: Reusing textures across materials significantly
 * reduces memory usage in scenes with repeated textures.
 *
 * @param url - URL of the texture to load
 * @param options - Optional texture settings
 * @returns Promise resolving to the loaded Texture
 *
 * @example
 * ```tsx
 * // Basic usage
 * const texture = await loadCachedTexture('/textures/wood.jpg')
 *
 * // With options for a diffuse map (needs mipmaps)
 * const diffuse = await loadCachedTexture('/textures/wood.jpg', {
 *   generateMipmaps: true,
 * })
 *
 * // Multiple loads return the same instance
 * const t1 = await loadCachedTexture('/hero.jpg')
 * const t2 = await loadCachedTexture('/hero.jpg')
 * console.log(t1 === t2) // true
 * ```
 */
export async function loadCachedTexture(
  url: string,
  options: CachedTextureOptions = {}
): Promise<Texture> {
  // Return cached texture if available
  const cached = textureCache.get(url)
  if (cached) {
    return cached
  }

  // Return pending load if this URL is already being loaded
  const pending = pendingLoads.get(url)
  if (pending) {
    return pending
  }

  // Destructure options with defaults optimized for UI textures
  const {
    generateMipmaps = false,
    minFilter = LinearFilter,
    magFilter = LinearFilter,
    flipY = true,
  } = options

  // Create and store the loading promise
  const loadPromise = new Promise<Texture>((resolve, reject) => {
    getLoader().load(
      url,
      (texture) => {
        // Apply settings
        texture.generateMipmaps = generateMipmaps
        texture.minFilter = minFilter
        texture.magFilter = magFilter
        texture.flipY = flipY
        texture.needsUpdate = true

        // Cache the loaded texture
        textureCache.set(url, texture)
        pendingLoads.delete(url)

        resolve(texture)
      },
      undefined, // onProgress (unused)
      (error) => {
        pendingLoads.delete(url)
        reject(error)
      }
    )
  })

  pendingLoads.set(url, loadPromise)
  return loadPromise
}

/**
 * Remove and dispose a specific texture from the cache.
 *
 * Call this when a texture is no longer needed to free GPU memory.
 * Safe to call even if the texture is not in the cache.
 *
 * @param url - URL of the texture to dispose
 *
 * @example
 * ```tsx
 * // Clean up a specific texture
 * disposeTextureFromCache('/textures/temporary.jpg')
 * ```
 */
export function disposeTextureFromCache(url: string): void {
  const texture = textureCache.get(url)
  if (texture) {
    texture.dispose()

    // Handle ImageBitmap sources (per Tip 38)
    const source = texture.source?.data
    if (source instanceof ImageBitmap) {
      source.close()
    }

    textureCache.delete(url)
  }
}

/**
 * Clear and dispose all textures from the cache.
 *
 * Call this when leaving a scene or during major transitions
 * to free all cached texture memory.
 *
 * @example
 * ```tsx
 * // On scene cleanup
 * useEffect(() => {
 *   return () => clearTextureCache()
 * }, [])
 * ```
 */
export function clearTextureCache(): void {
  for (const texture of textureCache.values()) {
    texture.dispose()

    // Handle ImageBitmap sources (per Tip 38)
    const source = texture.source?.data
    if (source instanceof ImageBitmap) {
      source.close()
    }
  }
  textureCache.clear()
}

/**
 * Get the number of cached textures.
 * Useful for debugging and memory monitoring.
 *
 * @returns Number of textures in the cache
 */
export function getTextureCacheSize(): number {
  return textureCache.size
}

/**
 * Check if a texture is already cached.
 *
 * @param url - URL to check
 * @returns true if the texture is cached
 */
export function isTextureCached(url: string): boolean {
  return textureCache.has(url)
}

/**
 * React hook for loading cached textures.
 *
 * Automatically handles loading state and ensures textures are cached.
 * Does NOT dispose on unmount since the texture is shared via cache.
 *
 * @param url - URL of the texture to load, or null/undefined to skip
 * @param options - Optional texture settings
 * @returns The loaded texture, or null while loading
 *
 * @example
 * ```tsx
 * function MyComponent({ imageUrl }: { imageUrl: string }) {
 *   const texture = useTextureCached(imageUrl)
 *
 *   if (!texture) return <LoadingSpinner />
 *
 *   return (
 *     <mesh>
 *       <planeGeometry />
 *       <meshBasicMaterial map={texture} />
 *     </mesh>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Conditional loading
 * function ConditionalTexture({ show, url }: { show: boolean; url: string }) {
 *   const texture = useTextureCached(show ? url : null)
 *   // ...
 * }
 * ```
 */
export function useTextureCached(
  url: string | null | undefined,
  options: CachedTextureOptions = {}
): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null)
  const optionsRef = useRef(options)

  // Update options ref when options change
  optionsRef.current = options

  useEffect(() => {
    if (!url) {
      setTexture(null)
      return
    }

    let cancelled = false

    loadCachedTexture(url, optionsRef.current)
      .then((loadedTexture) => {
        if (!cancelled) {
          setTexture(loadedTexture)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`Failed to load texture: ${url}`, error)
          setTexture(null)
        }
      })

    return () => {
      cancelled = true
      // Note: We don't dispose the texture here because it's cached
      // and may be used by other components. Use disposeTextureFromCache
      // or clearTextureCache when you're done with textures.
    }
  }, [url])

  return texture
}

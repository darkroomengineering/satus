declare module '@darkroom.engineering/hamo' {
  function useFrame(
    callback: (now: DOMHighResTimeStamp, deltaTime: number) => void,
    priority?: number
  ): void

  function useLazyState<V>(
    initialValue: V,
    callback: (newValue: V, oldValue: V) => void
  ): [() => V, (value: V | ((prevValue: V) => V)) => void]

  function useObjectFit(
    parentWidth?: number,
    parentHeight?: number,
    childWidth?: number,
    childHeight?: number,
    objectFit?: 'contain' | 'cover',
    deps?: unknown[]
  ): [number, number]

  interface ExtendedDOMRect extends DOMRect {
    top: number
    left: number
    right: number
    bottom: number
    element: HTMLElement
  }
  function useRect<L extends boolean = false>({
    ignoreTransform,
    ignoreSticky,
    debounce,
    lazy,
    callback,
  }?: {
    ignoreTransform?: boolean
    ignoreSticky?: boolean
    debounce?: number
    lazy?: L
    callback?: (rect: ExtendedDOMRect) => void
  }): [
    (element: HTMLElement | null) => void,
    L extends true ? () => ExtendedDOMRect : ExtendedDOMRect,
    (wrapperElement: HTMLElement | null) => void,
  ]

  function useResizeObserver<L extends boolean = false>({
    debounce,
    lazy,
    box,
    callback,
  }?: {
    debounce?: number
    lazy?: L
    box?: ResizeObserverBoxOptions
    callback?: (entry: ResizeObserverEntry) => void
  }): [
    (element: HTMLElement | null) => void,
    L extends true ? () => ResizeObserverEntry : ResizeObserverEntry,
  ]

  function useTimeout(
    callback: () => void,
    delay: number,
    deps?: unknown[]
  ): void

  function useWindowSize(debounceDelay?: number): {
    width: number | undefined
    height: number | undefined
  }

  function useOutsideClickEffect(
    ref: React.RefObject<HTMLElement>,
    callback: () => void
  ): void

  function useDebug(): boolean

  function useDocumentReadyState(): DocumentReadyState

  function useIntersectionObserver<L extends boolean = false>(
    {
      root,
      rootMargin,
      threshold,
      once,
      lazy,
      callback,
    }?: {
      root?: IntersectionObserverInit['root']
      rootMargin?: IntersectionObserverInit['rootMargin']
      threshold?: IntersectionObserverInit['threshold']
      once?: boolean
      lazy?: L
      callback?: (entries: IntersectionObserverEntry[]) => void
    },
    deps?: unknown[]
  ): [
    (element: HTMLElement | null) => void,
    L extends true
      ? () => IntersectionObserverEntry
      : IntersectionObserverEntry,
  ]

  function useInterval(
    callback: () => void,
    delay?: number,
    deps?: unknown[]
  ): void

  function useIsClient(): boolean

  function useIsTouchDevice(): boolean | undefined

  function useMediaQuery(query: string): boolean | undefined

  function useSlots(types: string[], children: React.ReactNode): React.ReactNode
}

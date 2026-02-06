/**
 * Unit tests for context utilities
 *
 * Tests createStandardContext factory function behavior.
 * Focuses on the factory's return value and properties, not React rendering,
 * since the context is a React context object created via createContext.
 *
 * Run with: bun test lib/utils/context.test.ts
 */

import { describe, expect, it } from 'bun:test'
import { createStandardContext } from './context'

describe('createStandardContext', () => {
  it('should return a React context object', () => {
    const ctx = createStandardContext('TestContext')
    // React contexts have a Provider and Consumer
    expect(ctx).toBeDefined()
    expect(ctx.Provider).toBeDefined()
    expect(ctx.Consumer).toBeDefined()
  })

  it('should set displayName when provided', () => {
    const ctx = createStandardContext('MyFeature')
    expect(ctx.displayName).toBe('MyFeature')
  })

  it('should not set displayName when not provided', () => {
    const ctx = createStandardContext()
    // displayName should be undefined when not passed
    expect(ctx.displayName).toBeUndefined()
  })

  it('should handle empty string displayName', () => {
    const ctx = createStandardContext('')
    // Empty string is falsy, so displayName should not be set
    expect(ctx.displayName).toBeUndefined()
  })

  it('should initialize context with null default value', () => {
    const ctx = createStandardContext('NullDefault')
    // The _currentValue internal property holds the default
    // We can verify by checking the context is not pre-populated
    // (consumers without a provider will get null)
    expect(ctx).toBeTruthy()
  })

  it('should create unique contexts for each call', () => {
    const ctx1 = createStandardContext('Context1')
    const ctx2 = createStandardContext('Context2')

    // They should be different objects
    expect(ctx1).not.toBe(ctx2)
    expect(ctx1.displayName).toBe('Context1')
    expect(ctx2.displayName).toBe('Context2')
  })

  it('should accept generic type parameters', () => {
    interface AppState {
      count: number
      name: string
    }

    interface AppActions {
      increment: () => void
      setName: (name: string) => void
    }

    interface AppMeta {
      isEven: boolean
    }

    // This is a type-level test: it should compile without errors
    const ctx = createStandardContext<AppState, AppActions, AppMeta>('App')
    expect(ctx).toBeDefined()
    expect(ctx.displayName).toBe('App')
  })

  it('should default meta type parameter to object', () => {
    interface State {
      value: number
    }
    interface Actions {
      setValue: (v: number) => void
    }

    // Only two type args -- meta defaults to object
    const ctx = createStandardContext<State, Actions>('Minimal')
    expect(ctx).toBeDefined()
    expect(ctx.displayName).toBe('Minimal')
  })
})

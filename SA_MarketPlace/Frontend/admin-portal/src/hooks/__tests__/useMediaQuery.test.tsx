import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from 'src/hooks/useMediaQuery'

const original = window.matchMedia

afterEach(() => {
  window.matchMedia = original
})

// A media query list the test can flip, as a resize would.
const fakeMedia = (matches: boolean) => {
  const listeners = new Set<() => void>()
  const list = {
    matches,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }
  window.matchMedia = vi.fn(() => list) as unknown as typeof window.matchMedia
  return {
    set: (next: boolean) => {
      list.matches = next
      listeners.forEach((listener) => listener())
    },
    listeners,
  }
}

describe('useMediaQuery', () => {
  it('is right on the first render', () => {
    fakeMedia(true)
    expect(renderHook(() => useMediaQuery('(min-width: 992px)')).result.current).toBe(true)
  })

  it('follows the window as it is resized', () => {
    const media = fakeMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 992px)'))

    act(() => media.set(false))

    expect(result.current).toBe(false)
  })

  it('stops listening when it goes away', () => {
    const media = fakeMedia(true)
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 992px)'))
    expect(media.listeners.size).toBe(1)

    unmount()

    expect(media.listeners.size).toBe(0)
  })
})

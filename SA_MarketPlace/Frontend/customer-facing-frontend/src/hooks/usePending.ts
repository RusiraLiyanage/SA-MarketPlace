import { useState } from 'react'

/**
 * Tracks one request in flight. `run` calls the handler and stays pending until the promise it returns settles, so a button can show a
 * spinner and ignore a second click meanwhile. A handler that returns nothing finishes at once.
 */
export const usePending = () => {
  const [pending, setPending] = useState(false)

  const run = async (action: () => unknown) => {
    setPending(true)
    try {
      await action()
    } finally {
      setPending(false)
    }
  }

  return { pending, run }
}

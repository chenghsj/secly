import { describe, expect, it, vi } from 'vitest'

import { createManagedRequestController } from './use-managed-request-slots'

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })

  return {
    promise,
    reject,
    resolve,
  }
}

describe('createManagedRequestController', () => {
  it('dedupes requests with the same kind and key', async () => {
    const deferred = createDeferred<string>()
    const execute = vi.fn(() => deferred.promise)
    const onSuccess = vi.fn()
    const controller = createManagedRequestController(['entries'])

    const firstPromise = controller.runManagedRequest({
      execute,
      kind: 'entries',
      onSuccess,
      requestKey: 'repo-a',
    })
    const secondPromise = controller.runManagedRequest({
      execute,
      kind: 'entries',
      onSuccess,
      requestKey: 'repo-a',
    })

    expect(execute).toHaveBeenCalledTimes(1)

    deferred.resolve('ready')

    await expect(firstPromise).resolves.toBe('ready')
    await expect(secondPromise).resolves.toBe('ready')
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('ready')
  })

  it('aborts an older request when a new key is requested for the same kind', async () => {
    const firstDeferred = createDeferred<string>()
    const secondDeferred = createDeferred<string>()
    const seenSignals: AbortSignal[] = []
    const execute = vi
      .fn<(signal: AbortSignal) => Promise<string>>()
      .mockImplementationOnce((signal) => {
        seenSignals.push(signal)
        return firstDeferred.promise
      })
      .mockImplementationOnce((signal) => {
        seenSignals.push(signal)
        return secondDeferred.promise
      })
    const onSuccess = vi.fn()
    const controller = createManagedRequestController(['entries'])

    const firstPromise = controller.runManagedRequest({
      execute,
      kind: 'entries',
      onSuccess,
      requestKey: 'repo-a',
    })
    const secondPromise = controller.runManagedRequest({
      execute,
      kind: 'entries',
      onSuccess,
      requestKey: 'repo-b',
    })

    expect(execute).toHaveBeenCalledTimes(2)
    expect(seenSignals[0]?.aborted).toBe(true)
    expect(seenSignals[1]?.aborted).toBe(false)

    firstDeferred.resolve('stale')
    secondDeferred.resolve('fresh')

    await expect(firstPromise).resolves.toBeUndefined()
    await expect(secondPromise).resolves.toBe('fresh')
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith('fresh')
  })
})

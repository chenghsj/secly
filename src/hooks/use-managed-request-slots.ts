import { useEffect, useRef } from 'react'

type ManagedRequestSlot = {
  controller: AbortController | null
  promise: Promise<unknown> | null
  requestId: number
  requestKey: string | null
}

function createManagedRequestSlots<TKind extends string>(
  kinds: readonly TKind[],
): Record<TKind, ManagedRequestSlot> {
  return Object.fromEntries(
    kinds.map((kind) => [
      kind,
      {
        controller: null,
        promise: null,
        requestId: 0,
        requestKey: null,
      },
    ]),
  ) as Record<TKind, ManagedRequestSlot>
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export function createManagedRequestController<TKind extends string>(
  kinds: readonly TKind[],
) {
  const slots = createManagedRequestSlots(kinds)

  function hasActiveManagedRequest(requestKinds: readonly TKind[]) {
    return requestKinds.some((kind) => slots[kind].controller !== null)
  }

  function abortManagedRequest(kind: TKind) {
    const slot = slots[kind]

    slot.controller?.abort()
    slot.controller = null
    slot.promise = null
    slot.requestKey = null
  }

  function abortManagedRequests(requestKinds: readonly TKind[] = kinds) {
    requestKinds.forEach((kind) => {
      abortManagedRequest(kind)
    })
  }

  function isCurrentManagedRequest(
    kind: TKind,
    requestId: number,
    controller: AbortController,
  ) {
    const slot = slots[kind]

    return (
      slot.requestId === requestId &&
      slot.controller === controller &&
      !controller.signal.aborted
    )
  }

  async function runManagedRequest<T>({
    execute,
    kind,
    onError,
    onFinish,
    onStart,
    onSuccess,
    requestKey,
  }: {
    execute: (signal: AbortSignal) => Promise<T>
    kind: TKind
    onError?: (error: unknown) => void
    onFinish?: () => void
    onStart?: () => void
    onSuccess: (result: T) => void
    requestKey: string
  }) {
    const slot = slots[kind]

    if (slot.requestKey === requestKey && slot.promise) {
      return slot.promise as Promise<T | undefined>
    }

    slot.controller?.abort()

    const controller = new AbortController()
    const requestId = slot.requestId + 1

    slot.controller = controller
    slot.requestId = requestId
    slot.requestKey = requestKey

    onStart?.()

    const promise = (async () => {
      try {
        const result = await execute(controller.signal)

        if (!isCurrentManagedRequest(kind, requestId, controller)) {
          return undefined
        }

        onSuccess(result)
        return result
      } catch (error) {
        if (
          controller.signal.aborted ||
          isAbortError(error) ||
          !isCurrentManagedRequest(kind, requestId, controller)
        ) {
          return undefined
        }

        onError?.(error)
        return undefined
      } finally {
        if (isCurrentManagedRequest(kind, requestId, controller)) {
          slot.controller = null
          slot.promise = null
          slot.requestKey = null
          onFinish?.()
        }
      }
    })()

    slot.promise = promise

    return promise
  }

  return {
    abortManagedRequest,
    abortManagedRequests,
    hasActiveManagedRequest,
    runManagedRequest,
  }
}

export function useManagedRequestSlots<TKind extends string>(
  kinds: readonly TKind[],
) {
  const controllerRef = useRef(createManagedRequestController(kinds))

  useEffect(() => {
    return () => {
      controllerRef.current.abortManagedRequests()
    }
  }, [])

  return controllerRef.current
}

type AbortLikeError = Error & {
  cause?: unknown
  code?: number | string
}

function isAbortLikeError(error: unknown): error is AbortLikeError {
  if (!(error instanceof Error)) {
    return false
  }

  if (
    error.name === 'AbortError' ||
    error.message === 'aborted' ||
    error.message === 'The operation was aborted' ||
    error.message === 'The operation was aborted.' ||
    (error as AbortLikeError).code === 'ABORT_ERR' ||
    (error as AbortLikeError).code === 'ECONNRESET'
  ) {
    return true
  }

  return isAbortLikeError((error as AbortLikeError).cause)
}

export function getCurrentRequestSignal() {
  return undefined
}

export function resolveAbortedReadRequestFallback<T>({
  error,
  fallback,
  signal,
}: {
  error: unknown
  fallback: T
  signal?: AbortSignal
}) {
  if (signal?.aborted && isAbortLikeError(error)) {
    return fallback
  }

  throw error
}

export function getErrorMsg(err: unknown, fallback: string): string {
  const raw = err instanceof Error
    ? err.message
    : (typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : fallback)
  return raw.replace(/^Error (?:occurred in handler for|invoking remote method) '[^']*': (?:Error: )?/, '')
}
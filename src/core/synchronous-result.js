export function requireSynchronousResult(result, message) {
  if (result != null && typeof result.then === 'function') {
    Promise.resolve(result).catch(() => {});
    throw new TypeError(message);
  }
  return result;
}

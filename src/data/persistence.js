/** Invoke a persistence callback; only its first settlement is accepted. */
export function invokePersistence(
  callback,
  editor,
  values,
  extra,
  success,
  error
) {
  let settled = false;
  const accept = (handler) => (value) => {
    if (settled) return;
    settled = true;
    handler(value);
  };
  const resolve = accept(success);
  const reject = accept(error);
  try {
    if (callback) {
      const result = callback.apply(
        editor,
        [editor, values, resolve, reject].concat(extra || [])
      );
      const then = result != null ? result.then : null;
      if (typeof then === 'function') then.call(result, resolve, reject);
    } else resolve(values);
  } catch (failure) {
    if (settled && editor.debug)
      console.error('Persistence callback failed after completion:', failure);
    reject(failure);
  }
}

export function parsePersistedRow(response) {
  if (typeof response !== 'string') return response;
  const json = response.trim();
  if (json.startsWith('{') || json.startsWith('[')) {
    try {
      return JSON.parse(json);
    } catch (_error) {}
  }
  return response;
}

export function acceptPersistedRow(response, candidate, errorMessage) {
  const row = response === undefined ? candidate : parsePersistedRow(response);
  if (!row || typeof row !== 'object') throw new Error(errorMessage);
  return row;
}

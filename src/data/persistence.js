import { root } from '../core/dependencies.js';

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
  let timer;
  const settle = () => {
    if (settled) return false;
    settled = true;
    if (timer !== undefined) root.clearTimeout(timer);
    if (editor._cancelPersistence === settle) delete editor._cancelPersistence;
    return true;
  };
  const accept = (handler) => (value) => {
    if (settle()) handler(value);
  };
  const resolve = accept(success);
  const reject = accept(error);
  try {
    if (callback) {
      editor._cancelPersistence = settle;
      const timeout = editor.c && editor.c.persistenceTimeout;
      if (timeout > 0)
        timer = root.setTimeout(() => {
          const failure = new Error(editor.language.error.persistenceTimeout);
          failure.name = 'TimeoutError';
          reject(failure);
        }, timeout);
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

export function cancelPersistence(editor) {
  if (editor._cancelPersistence) editor._cancelPersistence();
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

import { isPlainObject } from './objects.js';

const forbidden = ['__proto__', 'prototype', 'constructor'];
const isContainer = (value) => Array.isArray(value) || isPlainObject(value);

export function segments(path) {
  if (typeof path !== 'string' && typeof path !== 'number')
    throw new Error('Invalid field path');
  const keys = String(path).split('.');
  if (keys.some((key) => !key || forbidden.indexOf(key) !== -1))
    throw new Error('Unsafe or invalid field path: ' + path);
  return keys;
}

export function readPath(source, path) {
  return segments(path).reduce(
    (value, key) => (value == null ? undefined : value[key]),
    source
  );
}

export function isFieldPath(path) {
  try {
    segments(path);
    return !/[\[\]()\\]/.test(String(path));
  } catch (_error) {
    return false;
  }
}

export function copyProperties(source) {
  const result = {};
  Object.keys(source || {}).forEach((key) => {
    Object.defineProperty(result, key, {
      value: source[key],
      enumerable: true,
      writable: true,
      configurable: true,
    });
  });
  return result;
}

export function writePath(target, path, value) {
  const keys = segments(path);
  if (!isContainer(target))
    throw new TypeError('Cannot write through a non-object field: ' + path);
  let cursor = target;
  keys.slice(0, -1).forEach((key, index) => {
    if (cursor[key] != null && !isContainer(cursor[key]))
      throw new TypeError('Cannot write through a non-object field: ' + path);
    if (cursor[key] == null)
      cursor[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
  return target;
}

/** Copy the edited branches so persistence never changes the original row. */
export function withValue(source, path, value) {
  return withValues(source, [[path, value]]);
}

/** Copy each modified row branch once, preserving untouched values. */
export function withValues(source, updates) {
  if (!updates.length) return source;
  const originals = new WeakMap();
  const copy = (original) => {
    const result = Array.isArray(original)
      ? original.slice()
      : copyProperties(original);
    originals.set(result, original);
    return result;
  };
  let result;
  for (const [path, value] of updates) {
    const keys = segments(path);
    if (!result) {
      if (source != null && !isContainer(source))
        throw new TypeError('Cannot write through a non-object field: ' + path);
      result = copy(source);
    }
    let cursor = result;
    for (let index = 0; index < keys.length - 1; index++) {
      const key = keys[index];
      const original = originals.get(cursor);
      // Array slicing omits named properties, which can still be addressed by a path.
      const branch =
        Array.isArray(cursor) &&
        original &&
        !Object.prototype.hasOwnProperty.call(cursor, key)
          ? original[key]
          : cursor[key];
      if (branch == null) {
        const created = /^\d+$/.test(keys[index + 1]) ? [] : {};
        originals.set(created, undefined);
        cursor[key] = created;
      } else {
        if (!isContainer(branch))
          throw new TypeError(
            'Cannot write through a non-object field: ' + path
          );
        if (!originals.has(branch)) cursor[key] = copy(branch);
      }
      cursor = cursor[key];
    }
    cursor[keys[keys.length - 1]] = value;
  }
  return result;
}

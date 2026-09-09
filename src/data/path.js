const forbidden = ['__proto__', 'prototype', 'constructor'];

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
    source,
  );
}

export function writePath(target, path, value) {
  const keys = segments(path);
  let cursor = target;
  keys.slice(0, -1).forEach((key, index) => {
    if (!cursor[key] || typeof cursor[key] !== 'object')
      cursor[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
  return target;
}

/** Copy the edited branches so persistence never changes the original row. */
export function withValue(source, path, value) {
  const keys = segments(path);
  const copy = (item) =>
    Array.isArray(item) ? item.slice() : Object.assign({}, item);
  const result = copy(source);
  let cursor = result;
  let original = source;
  keys.slice(0, -1).forEach((key, index) => {
    original = original == null ? undefined : original[key];
    cursor[key] =
      original && typeof original === 'object'
        ? copy(original)
        : /^\d+$/.test(keys[index + 1])
          ? []
          : {};
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
  return result;
}

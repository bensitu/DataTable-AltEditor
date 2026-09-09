import { expect, test } from 'vitest';
import { readPath, writePath, withValue } from '../src/data/path.js';
import { mergeOptions, normalizeOptions } from '../src/core/options.js';

test('updates nested objects and numeric array sources immutably', () => {
  const original = {
    user: { name: 'Alice', email: 'a@example.com' },
    other: {},
  };
  const candidate = withValue(original, 'user.name', 'Ann');
  expect(original.user.name).toBe('Alice');
  expect(candidate.user.email).toBe('a@example.com');
  expect(candidate.other).toBe(original.other);
  expect(withValue(['a', 'b'], 0, 'c')).toEqual(['c', 'b']);
  expect(readPath(['a'], 0)).toBe('a');
  for (const path of ['__proto__.x', 'user.constructor.x', 'prototype.x']) {
    expect(() => readPath(original, path)).toThrow();
    expect(() => writePath({}, path, 1)).toThrow();
    expect(() => withValue(original, path, 1)).toThrow();
  }
});

test('merges configuration in precedence order without losing falsy values or functions', () => {
  const callback = () => {};
  const date = new Date();
  const list = ['b'];
  const result = mergeOptions(
    { list: ['a', 'c'] },
    { callback, date, list, zero: 0, empty: '', enabled: false },
  );
  expect(result.callback).toBe(callback);
  expect(result.date).toBe(date);
  expect(result.list).toEqual(['b']);
  expect(result.list).not.toBe(list);
  expect(result.zero).toBe(0);
  expect(result.empty).toBe('');
  expect(result.enabled).toBe(false);
  expect(() => mergeOptions(JSON.parse('{"__proto__": {"x": 1}}'))).toThrow();
  expect(
    normalizeOptions(
      { debug: true },
      { debug: true, altEditor: { debug: false, inlineEdit: true } },
    ).debug,
  ).toBe(false);
  expect(
    normalizeOptions({}, { altEditor: { inlineEdit: true } }).inlineEdit
      .enabled,
  ).toBe(true);
});

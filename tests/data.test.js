import { expect, test } from 'vitest';
import { readPath, writePath, withValue } from '../src/data/path.js';
import { mergeOptions, normalizeOptions } from '../src/core/options.js';
import { cloneRow } from '../src/data/row-data.js';
import { equalFieldValues } from '../src/data/field-values.js';

test('copies unrelated metadata safely while preserving protected path validation', () => {
  const row = JSON.parse(
    '{"name":"Alice","constructor":"Maker","__proto__":{"custom":true}}'
  );
  const copy = cloneRow(row);
  const edited = withValue(copy, 'name', 'Ann');
  expect(Object.getPrototypeOf(edited)).toBe(Object.prototype);
  expect(Object.prototype.custom).toBeUndefined();
  expect(edited.constructor).toBe('Maker');
  expect(Object.hasOwn(edited, '__proto__')).toBe(true);
  expect(edited.__proto__).toEqual({ custom: true });
  expect(row.name).toBe('Alice');
  expect(() => withValue(row, '__proto__.custom', false)).toThrow();
});

test('compares unique values according to field type without treating blanks as zero', () => {
  expect(equalFieldValues('', 0, 'number')).toBe(false);
  expect(equalFieldValues('01', 1, 'text')).toBe(false);
  expect(equalFieldValues('01', 1, 'number')).toBe(true);
  expect(equalFieldValues('1', 1, 'select')).toBe(true);
  expect(equalFieldValues(['a', 'b'], ['b', 'c'], 'select')).toBe(true);
  expect(equalFieldValues(null, null, 'text')).toBe(false);
});

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
    { callback, date, list, zero: 0, empty: '', enabled: false }
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
      { debug: true, altEditor: { debug: false, inlineEdit: true } }
    ).debug
  ).toBe(false);
  expect(
    normalizeOptions({}, { altEditor: { inlineEdit: true } }).inlineEdit.enabled
  ).toBe(true);
});

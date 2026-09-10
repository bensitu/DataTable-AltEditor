import { expect, test } from 'vitest';
import '../src/index.js';
import {
  controlOptions,
  createControl,
  controlValue,
} from '../src/inline/inline-control.js';
import { methods as fields } from '../src/dialog/field-renderer.js';
import { methods as plugins } from '../src/dialog/plugins.js';
import $ from 'jquery';

test('normalizes supported select formats and retains multiple selected values', () => {
  const options = [
    'Plain',
    { id: 'b', text: 'Beta' },
    { value: 'a', label: 'Alpha' },
    { value: 'z' },
  ];
  expect(fields._normalizeOptions(options)).toEqual([
    { value: 'Plain', label: 'Plain' },
    { value: 'b', label: 'Beta' },
    { value: 'a', label: 'Alpha' },
    { value: 'z', label: 'z' },
  ]);
  const control = createControl(
    { type: 'select', options, multiple: true, optionsSortByLabel: true },
    ['b', 'a']
  );
  expect([...control.options].map((o) => o.textContent)).toEqual([
    'Alpha',
    'Beta',
    'Plain',
    'z',
  ]);
  expect(controlValue(control)).toEqual(['a', 'b']);
  const editor = { ...fields, ...plugins };
  editor.reloadOptions(control, { a: '<Alpha>', c: 'Gamma' });
  expect(controlValue(control)).toEqual(['a']);
  expect(control.options[0].textContent).toBe('<Alpha>');
  expect(control.querySelector('Alpha')).toBeNull();
  editor.reloadOptions(control);
  expect(control.options).toHaveLength(0);
});

test('preserves numeric, empty, multiline and checkbox values with native constraints', () => {
  const number = createControl(
    { type: 'number', min: 0, max: 10, step: 2, required: true },
    4
  );
  expect(controlValue(number)).toBe(4);
  number.value = '3';
  expect(number.checkValidity()).toBe(false);
  number.value = '';
  expect(controlValue(number)).toBe('');
  expect(number.checkValidity()).toBe(false);
  const textarea = createControl(
    {
      type: 'textarea',
      rows: 3,
      cols: 20,
      maxLength: 50,
      placeholder: 'Notes',
      required: false,
    },
    null
  );
  expect(textarea.value).toBe('');
  expect(textarea.required).toBe(false);
  textarea.value = 'First\nSecond';
  expect(controlValue(textarea)).toBe('First\nSecond');
  for (const value of [
    true,
    1,
    'yes',
    'ON',
    'true',
    '1',
    false,
    0,
    'no',
    null,
  ]) {
    const expected = [true, 1, 'yes', 'ON', 'true', '1'].includes(value);
    const checkbox = createControl({ type: 'checkbox' }, value);
    expect(controlValue(checkbox)).toBe(expected);
    plugins._setFieldValue($(checkbox), { type: 'checkbox' }, value);
    expect(checkbox.checked).toBe(expected);
  }
});

test('restricts inline controls to writable sources and honors explicit overrides', () => {
  for (const override of [
    { readonly: true },
    { disabled: true },
    { type: 'hidden' },
    { type: 'readonly' },
    { inlineEditable: false },
    { editable: false },
    { name: null },
    { name: undefined },
    { name: '__proto__.value' },
    { name: 'items[].name' },
    { name: 'user\\.name' },
    { type: 'select2' },
    { inlineEditOptions: { disabled: true } },
  ])
    expect(controlOptions({ name: 'name', ...override })).toBeNull();
  expect(controlOptions()).toBeNull();
  const column = {
    name: 'notes',
    editable: false,
    inlineEditable: true,
    inlineEditType: 'textarea',
    inlineEditOptions: { rows: 4 },
  };
  expect(controlOptions(column)).toMatchObject({ type: 'textarea', rows: 4 });
  expect(column).not.toHaveProperty('rows');
  expect(
    controlOptions({ name: 'items[].name', inlineEditSetValue: () => ({}) })
  ).not.toBeNull();
});

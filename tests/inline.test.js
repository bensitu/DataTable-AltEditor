import $ from 'jquery';
import DataTable from 'datatables.net';
import '../src/index.js';
import { afterEach, expect, test, vi } from 'vitest';

const tables = [];
function create(options = {}) {
  const node = document.createElement('table');
  document.body.appendChild(node);
  const table = new DataTable(node, {
    data: [
      { id: 'a', user: { name: 'Alice' }, age: 30 },
      { id: 'b', user: { name: 'Bob' }, age: 40 },
    ],
    rowId: 'id',
    columns: [
      { data: 'user.name', title: 'Name', required: true },
      { data: 'age', title: 'Age', type: 'number', min: 0 },
    ],
    altEditor: { inlineEdit: true },
    ...options,
  });
  tables.push(table);
  return { table, editor: table.altEditor() };
}
afterEach(() => {
  tables.splice(0).forEach((table) => table.destroy());
  document.body.innerHTML = '';
});
const input = () => document.querySelector('.alteditor-inline-control');

test('handles composition, Enter, Escape and keyboard navigation without duplicate submission', () => {
  const { editor, table } = create();
  const cell = table.cell(0, 0).node();
  cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(input()).not.toBeNull();
  expect(editor.startInlineEdit(cell)).toBe(true);
  input().value = 'Ann';
  input().dispatchEvent(new Event('compositionstart'));
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  );
  expect(editor.commitInlineEdit()).toBe(false);
  expect(table.row(0).data().user.name).toBe('Alice');
  input().dispatchEvent(new Event('compositionend'));
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
  );
  expect(table.row(0).data().user.name).toBe('Ann');
  expect(input().type).toBe('number');
  input().value = '32';
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
  );
  expect(table.row(0).data().age).toBe(32);
  expect(input().type).toBe('text');
  input().value = 'Discarded';
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );
  expect(editor.isInlineEditing()).toBe(false);
  expect(table.row(0).data().user.name).toBe('Ann');
  editor.startInlineEdit({ row: 0, column: 1 });
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
  );
  expect(editor.isInlineEditing()).toBe(false);
  expect(document.activeElement).toBe(table.cell(0, 1).node());
  editor.startInlineEdit({ row: 0, column: 0 });
  input().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  );
  expect(editor.isInlineEditing()).toBe(false);
});

test('preserves rendered controls and still edits decorative markup', () => {
  const { editor, table } = create();
  const cell = table.cell(0, 0).node();
  for (const markup of [
    '<input value="Alice">',
    '<input type="checkbox">',
    '<textarea>Alice</textarea>',
    '<button><span>Details</span></button>',
    '<a href="#details">Details</a>',
    '<span contenteditable="true">Alice</span>',
    '<details><summary>Details</summary>Alice</details>',
    '<video controls></video>',
    '<audio controls></audio>',
    '<span tabindex="0">Custom control</span>',
    '<span role="switch" aria-checked="false">Off</span>',
  ]) {
    cell.innerHTML = markup;
    const rendered = cell.innerHTML;
    cell.firstElementChild.dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true })
    );
    expect(editor.isInlineEditing()).toBe(false);
    expect(editor.startInlineEdit(cell)).toBe(false);
    expect(cell.innerHTML).toBe(rendered);
  }
  cell.innerHTML = '<strong>Alice</strong>';
  cell.firstElementChild.dispatchEvent(
    new MouseEvent('dblclick', { bubbles: true })
  );
  expect(input().value).toBe('Alice');
  editor.cancelInlineEdit();
  expect(cell.innerHTML).toBe('<strong>Alice</strong>');
});

test.each([false, true])('honors submitOnBlur=%s', (submitOnBlur) => {
  const { editor, table } = create({
    altEditor: {
      inlineEdit: { enabled: true, submitOnBlur, selectText: false },
    },
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  input().value = 'Ann';
  input().dispatchEvent(new Event('blur'));
  expect(editor.isInlineEditing()).toBe(false);
  expect(table.row(0).data().user.name).toBe(submitOnBlur ? 'Ann' : 'Alice');
});

test('validates uniqueness, clears stale errors and accepts corrected input', () => {
  const { editor, table } = create({
    columns: [{ data: 'user.name', title: 'Name', unique: true }],
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  input().value = 'Bob';
  expect(editor.commitInlineEdit()).toBe(false);
  expect(document.querySelector('.alteditor-inline-error').textContent).toBe(
    editor.language.error.unique
  );
  input().value = 'Ann';
  input().dispatchEvent(new Event('input'));
  expect(input().hasAttribute('aria-invalid')).toBe(false);
  expect(document.querySelector('.alteditor-inline-error').textContent).toBe(
    ''
  );
  expect(editor.commitInlineEdit()).toBe(true);
  expect(table.row(0).data().user.name).toBe('Ann');
});

test('reattaches a failed save after redraw and accepts a corrected server response', () => {
  let accept, reject;
  const { editor, table } = create({
    onInlineEditRow: (_editor, _values, success, error) => {
      accept = success;
      reject = error;
    },
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  input().value = 'Ann';
  editor.commitInlineEdit();
  expect(editor.cancelInlineEdit()).toBe(false);
  expect(editor.startInlineEdit({ row: 1, column: 0 })).toBe(false);
  expect(editor.commitInlineEdit()).toBe(false);
  table.draw();
  reject();
  expect(input().value).toBe('Ann');
  expect(document.querySelector('.alteditor-inline-error').textContent).toBe(
    editor.language.error.message
  );
  editor.commitInlineEdit();
  accept('invalid');
  expect(editor.isInlineEditing()).toBe(true);
  editor.commitInlineEdit();
  accept('{"id":"a","user":{"name":"Accepted"},"age":30}');
  expect(table.row(0).data().user.name).toBe('Accepted');
});

test('keeps nested row data unchanged until the first successful settlement', () => {
  let accept, reject;
  const callback = vi.fn((_editor, _row, success, error) => {
    accept = success;
    reject = error;
  });
  const { table, editor } = create({ onEditRow: callback });
  const original = table.row(0).data();
  expect(editor.startInlineEdit({ row: 0, column: 0 })).toBe(true);
  input().value = 'Ann';
  editor.commitInlineEdit();
  expect(table.row(0).data()).toBe(original);
  expect(original.user.name).toBe('Alice');
  expect(callback.mock.calls[0][1]).toEqual({
    id: 'a',
    user: { name: 'Ann' },
    age: 30,
  });
  expect(callback.mock.calls[0][4]).toEqual(original);
  accept();
  reject('Late error');
  accept({ id: 'x' });
  expect(table.row(0).data().user.name).toBe('Ann');
  expect(editor.isInlineEditing()).toBe(false);
});

test('retains invalid or rejected values for correction and retry', () => {
  let fail = true;
  const { table, editor } = create({
    onInlineEditRow: (_editor, values, success, error) =>
      fail ? error('<b>Unavailable</b>') : success(values),
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  input().value = '';
  expect(editor.commitInlineEdit()).toBe(false);
  expect(editor.isInlineEditing()).toBe(true);
  input().value = 'Ann';
  editor.commitInlineEdit();
  expect(table.row(0).data().user.name).toBe('Alice');
  expect(input().disabled).toBe(false);
  expect(document.querySelector('.alteditor-inline-error').textContent).toBe(
    '<b>Unavailable</b>'
  );
  expect(document.querySelector('.alteditor-inline-error b')).toBeNull();
  fail = false;
  editor.commitInlineEdit();
  expect(table.row(0).data().user.name).toBe('Ann');
});

test('uses numeric data sources and explicit setters for complex sources', () => {
  const { table, editor } = create({
    data: [['Tokyo', 'Alice']],
    columns: [
      { data: 1, title: 'Name' },
      { data: 0, title: 'City' },
    ],
    rowId: undefined,
  });
  editor.startInlineEdit({ row: 0, column: 1 });
  input().value = 'Osaka';
  editor.commitInlineEdit();
  expect(table.row(0).data()).toEqual(['Osaka', 'Alice']);
  const complex = create({
    columns: [
      {
        data: (row) => row.user.name,
        title: 'Name',
        inlineEditSetValue: (row, value) => {
          row.user.name = value;
          return row;
        },
      },
    ],
  });
  const original = complex.table.row(0).data();
  complex.editor.startInlineEdit({ row: 0, column: 0 });
  input().value = 'Ann';
  complex.editor.commitInlineEdit();
  expect(original.user.name).toBe('Alice');
  expect(complex.table.row(0).data().user.name).toBe('Ann');
});

test('ignores unsupported cells and honors cancelable inline events', () => {
  const disabled = create({ altEditor: true });
  expect(disabled.editor.startInlineEdit({ row: 0, column: 0 })).toBe(false);
  const { editor, table } = create({
    columns: [
      { data: (row) => row.user.name, title: 'Name' },
      { data: 'age', title: 'Age', readonly: true },
      { data: 'id', title: 'ID', type: 'file' },
      { data: 'user.name', title: 'Name' },
    ],
  });
  [0, 1, 2].forEach((column) =>
    expect(editor.startInlineEdit({ row: 0, column })).toBe(false)
  );
  $(table.table().node()).on(
    'alteditor-inline-pre-submit.dt',
    (event, payload) => {
      expect(event.dt.table().node()).toBe(table.table().node());
      expect(payload.editor).toBe(editor);
      event.preventDefault();
    }
  );
  editor.startInlineEdit({ row: 0, column: 3 });
  input().value = 'Ann';
  editor.commitInlineEdit();
  expect(input().disabled).toBe(false);
  expect(table.row(0).data().user.name).toBe('Alice');
  editor.cancelInlineEdit();
  expect(input()).toBeNull();
});

test('allows redraw during persistence and never updates a replacement row', () => {
  let success;
  const { table, editor } = create({
    onInlineEditRow: (_editor, _row, accept) => {
      success = accept;
    },
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  input().value = 'Ann';
  editor.commitInlineEdit();
  table.order([1, 'desc']).draw();
  expect(input()).toBeNull();
  expect(editor.isInlineEditing()).toBe(true);
  success();
  expect(table.row('#a').data().user.name).toBe('Ann');
  editor.startInlineEdit({ row: 0, column: 0 });
  input().value = 'Carol';
  editor.commitInlineEdit();
  table.row('#a').remove();
  table.row.add({ id: 'c', user: { name: 'Carol' }, age: 10 }).draw();
  const error = vi.fn();
  $(table.table().node()).on('alteditor-inline-error.dt', error);
  success();
  expect(error).toHaveBeenCalledOnce();
  expect(editor.isInlineEditing()).toBe(false);
  expect(table.row('#b').data().user.name).toBe('Bob');
});

test('isolates tables and cleans editing or pending persistence on destroy', () => {
  let success;
  const first = create({
    onInlineEditRow: (_editor, _row, accept) => {
      success = accept;
    },
  });
  const second = create();
  first.editor.startInlineEdit({ row: 0, column: 0 });
  first.editor.commitInlineEdit();
  second.editor.startInlineEdit({ row: 0, column: 0 });
  first.editor.destroy();
  success();
  expect(first.editor.isInlineEditing()).toBe(false);
  expect(second.editor.isInlineEditing()).toBe(true);
  second.table.draw();
  expect(second.editor.isInlineEditing()).toBe(false);
});

test('reads checkbox and select values and rejects an invalid explicit setter', () => {
  const { editor, table } = create({
    data: [{ enabled: false, role: 'reader' }],
    columns: [
      { data: 'enabled', title: 'Enabled', type: 'checkbox' },
      {
        data: 'role',
        title: 'Role',
        type: 'select',
        options: { reader: '<Reader>', editor: 'Editor' },
      },
    ],
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  input().checked = true;
  editor.commitInlineEdit();
  expect(table.row(0).data().enabled).toBe(true);
  editor.startInlineEdit({ row: 0, column: 1 });
  expect(input().options[0].textContent).toBe('<Reader>');
  input().value = 'editor';
  editor.commitInlineEdit();
  expect(table.row(0).data().role).toBe('editor');
  const invalid = create({
    columns: [
      {
        data: (row) => row.age,
        title: 'Age',
        inlineEditSetValue: () => undefined,
      },
    ],
  });
  invalid.editor.startInlineEdit({ row: 0, column: 0 });
  expect(invalid.editor.commitInlineEdit()).toBe(false);
  expect(invalid.editor.isInlineEditing()).toBe(true);
});

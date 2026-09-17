import $ from 'jquery';
import DataTable from 'datatables.net';
import '../src/index.js';
import { invoke } from '../src/data/row-data.js';
import { afterEach, expect, test, vi } from 'vitest';

const tables = [];
function create(options = {}) {
  const node = document.createElement('table');
  document.body.appendChild(node);
  const table = new DataTable(node, {
    data: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    rowId: 'id',
    columns: [{ data: 'name', title: 'Name' }],
    altEditor: { inlineEdit: true },
    ...options,
  });
  tables.push(table);
  const editor = table.altEditor();
  editor.internalOpenDialog = (_selector, fill) => fill();
  editor.internalCloseDialog = () => editor._handleDialogClosed();
  return { editor, table };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
afterEach(() => {
  tables.splice(0).forEach((table) => table.destroy());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

test('accepts only the first callback or thenable settlement and handles throwing then access', async () => {
  for (const outcome of ['success', 'error']) {
    const success = vi.fn(),
      error = vi.fn();
    invoke(
      (_editor, row, accept, reject) => {
        (outcome === 'success' ? accept : reject)('first');
        accept('duplicate');
        return Promise.reject('late');
      },
      {},
      {},
      [],
      success,
      error
    );
    await flush();
    expect(
      outcome === 'success' ? success : error
    ).toHaveBeenCalledExactlyOnceWith('first');
    expect(outcome === 'success' ? error : success).not.toHaveBeenCalled();
  }
  const success = vi.fn(),
    error = vi.fn();
  invoke(
    () => ({
      get then() {
        throw new Error('Cannot subscribe');
      },
    }),
    {},
    {},
    [],
    success,
    error
  );
  expect(error.mock.calls[0][0].message).toBe('Cannot subscribe');
  invoke(
    () => ({
      then(resolve, reject) {
        resolve('row');
        reject('late');
        throw new Error('late');
      },
    }),
    {},
    {},
    [],
    success,
    error
  );
  expect(success).toHaveBeenCalledExactlyOnceWith('row');
  expect(error).toHaveBeenCalledTimes(1);
  invoke(() => ({ name: 'ordinary return' }), {}, {}, [], success, error);
  expect(success).toHaveBeenCalledTimes(1);
});

test('async add, edit and delete preserve success defaults and apply returned server data once', async () => {
  const { editor, table } = create({
    onAddRow: async (_editor, values) => ({ ...values, id: 'c' }),
    onEditRow: async () => undefined,
    onDeleteRow: async () => undefined,
  });
  const success = vi.fn(),
    draw = vi.fn();
  table.on('alteditor-success.dt', success).on('draw.dt', draw);
  editor.openAddDialog();
  $(editor.modal_selector).find('[name="name"]').val('Carol');
  await editor._addRowData();
  await flush();
  expect(table.row('#c').data().name).toBe('Carol');
  editor.openEditDialog('#c');
  $(editor.modal_selector).find('[name="name"]').val('Caroline');
  await editor._editRowData();
  await flush();
  expect(table.row('#c').data()).toEqual({ id: 'c', name: 'Caroline' });
  editor.openDeleteDialog('#c');
  await editor._deleteRow();
  await flush();
  expect(table.row('#c').any()).toBe(false);
  expect(success).toHaveBeenCalledTimes(3);
  expect(draw).toHaveBeenCalledTimes(3);
});

test.each(['close', 'destroy', 'remove'])(
  'suppresses pending edit results after %s',
  async (action) => {
    let resolve;
    const save = vi.fn(
      () =>
        new Promise((accept) => {
          resolve = accept;
        })
    );
    const { editor, table } = create({ onEditRow: save });
    const success = vi.fn();
    table.on('alteditor-success.dt', success);
    editor.openEditDialog(0);
    await editor._editRowData();
    editor._editRowData();
    expect(save).toHaveBeenCalledTimes(1);
    if (action === 'close') {
      editor._handleDialogClosed();
      editor.openEditDialog(1);
    }
    if (action === 'destroy') editor.destroy();
    if (action === 'remove') table.row(0).remove().draw();
    resolve({ id: 'a', name: 'Late' });
    await flush();
    expect(table.row('#b').data().name).toBe('Bob');
    expect(success).not.toHaveBeenCalled();
    if (action === 'close')
      expect($(editor.modal_selector).find('[name="name"]').val()).toBe('Bob');
  }
);

test('Promise rejection wins against delayed success and allows inline correction', async () => {
  let late;
  const { editor, table } = create({
    onInlineEditRow: (_editor, _row, success) => {
      late = success;
      return Promise.reject(new Error('Try another name'));
    },
  });
  editor.startInlineEdit({ row: 0, column: 0 });
  const control = document.querySelector('.alteditor-inline-control');
  control.value = 'Ann';
  editor.commitInlineEdit();
  await flush();
  late({ id: 'a', name: 'Late' });
  expect(table.row(0).data().name).toBe('Alice');
  expect(control.disabled).toBe(false);
  expect(document.querySelector('.alteditor-inline-error').textContent).toBe(
    'Try another name'
  );
  editor.onInlineEditRow = async () => undefined;
  editor.commitInlineEdit();
  await flush();
  expect(table.row(0).data().name).toBe('Ann');
});

test('a resolved Promise wins against a later callback and a missing delete target is retained', async () => {
  let late;
  const accept = vi.fn(),
    reject = vi.fn();
  invoke(
    (_editor, _row, success) => {
      late = success;
      return Promise.resolve('first');
    },
    {},
    {},
    [],
    accept,
    reject
  );
  await flush();
  late('late');
  expect(accept).toHaveBeenCalledExactlyOnceWith('first');
  expect(reject).not.toHaveBeenCalled();
  let complete;
  const { editor, table } = create({
    onDeleteRow: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  const success = vi.fn();
  table.on('alteditor-success.dt', success);
  editor.openDeleteDialog(0);
  await editor._deleteRow();
  table.row(0).remove().draw();
  complete();
  await flush();
  expect(table.row('#b').data().name).toBe('Bob');
  expect(success).not.toHaveBeenCalled();
  expect(editor._submitting).toBe(false);
});

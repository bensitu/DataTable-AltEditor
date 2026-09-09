import $ from 'jquery';
import DataTable from 'datatables.net';
import 'datatables.net-select';
import '../src/dataTables.altEditor.free.js';
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
    columns: [
      { data: 'id', title: 'ID' },
      { data: 'name', title: 'Name', required: true },
    ],
    select: true,
    altEditor: true,
    closeModalOnSuccess: false,
    ...options,
  });
  tables.push(table);
  const editor = node.altEditor;
  editor.internalOpenDialog = (_selector, fill) => fill();
  return { table, editor };
}
afterEach(() => {
  tables.splice(0).forEach((table) => table.destroy());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('adds, edits and deletes the captured row despite selection changes', async () => {
  const { table, editor } = create();
  editor._openAddModal();
  $(editor.modal_selector).find('[name="id"]').val('c');
  $(editor.modal_selector).find('[name="name"]').val('Carol');
  editor._addRowData();
  await flush();
  expect(table.rows().count()).toBe(3);
  table.row(0).select();
  editor._openEditModal();
  table.row(0).deselect();
  table.row(1).select();
  $(editor.modal_selector).find('[name="name"]').val('Ann');
  editor._editRowData();
  await flush();
  expect(table.row(0).data().name).toBe('Ann');
  expect(table.row(1).data().name).toBe('Bob');
  editor._openDeleteModal();
  table.row(1).deselect();
  table.row(0).select();
  editor._deleteRow();
  expect(
    table
      .rows()
      .data()
      .toArray()
      .map((row) => row.id),
  ).toEqual(['a', 'c']);
});

test('keeps callback errors editable and renders error text safely', async () => {
  const callback = vi.fn((_editor, _row, success, error) =>
    error(new Error('<img src=x onerror=alert(1)>')),
  );
  const { editor, table } = create({ onAddRow: callback });
  editor._openAddModal();
  $(editor.modal_selector).find('[name="name"]').val('Carol');
  editor._addRowData();
  await flush();
  expect(callback).toHaveBeenCalledOnce();
  expect(table.rows().count()).toBe(2);
  expect($(editor.modal_selector).find('.alert').text()).toContain('<img');
  expect($(editor.modal_selector).find('img').length).toBe(0);
  expect(editor._submitting).toBe(false);
});

test('collects numeric zero and nested fields without changing another table', async () => {
  const first = create({
    data: [['Alice', 'Tokyo']],
    columns: [
      { data: 0, title: 'Name' },
      { data: 1, title: 'City' },
    ],
  });
  const second = create({
    data: [{ user: { name: 'Bob' } }],
    columns: [{ data: 'user.name', title: 'Name' }],
  });
  first.table.row(0).select();
  first.editor._openEditModal();
  $(first.editor.modal_selector).find('[name="0"]').val('Ann');
  first.editor._editRowData();
  await flush();
  expect(first.table.row(0).data()).toEqual(['Ann', 'Tokyo']);
  second.table.row(0).select();
  second.editor._openEditModal();
  $(second.editor.modal_selector).find('[name="user.name"]').val('Bill');
  second.editor._editRowData();
  await flush();
  expect(second.table.row(0).data()).toEqual({ user: { name: 'Bill' } });
});

test('loads configured language and releases dialog elements on destroy', () => {
  const { table, editor } = create({
    language: { altEditor: { add: { title: 'Create item' } } },
  });
  editor._openAddModal();
  expect($(editor.modal_selector).find('.modal-title').text()).toBe(
    'Create item',
  );
  table.destroy();
  tables.pop();
  expect(document.querySelector(editor.modal_selector)).toBeNull();
});

import $ from 'jquery';
import DataTable from 'datatables.net';
import 'datatables.net-select';
import 'datatables.net-buttons';
import '../src/index.js';
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

test('rejects oversized files before encoding and permits a smaller replacement', async () => {
  const { editor, table } = create({
    columns: [
      { data: 'name', title: 'Name' },
      {
        data: 'attachment',
        title: 'File',
        type: 'file',
        maxFileSize: 4,
        defaultContent: '',
      },
    ],
  });
  editor.openAddDialog();
  const fileInput = $(editor.modal_selector).find('[type="file"]')[0];
  const reader = vi.spyOn(editor, 'getBase64');
  Object.defineProperty(fileInput, 'files', {
    value: [new File(['large'], 'file.txt')],
    configurable: true,
  });
  await editor._addRowData();
  expect(reader).not.toHaveBeenCalled();
  expect(table.rows().count()).toBe(2);
  expect($(editor.modal_selector).find('.alert').text()).toContain(
    'File exceeds'
  );
  Object.defineProperty(fileInput, 'files', {
    value: [new File(['ok'], 'file.txt')],
    configurable: true,
  });
  await editor._addRowData();
  expect(table.rows().count()).toBe(3);
});

test('preserves unsupported fields and edits names containing CSS punctuation', async () => {
  const original = {
    'first:name': 'Alice',
    'postal code': '0123',
    choice: 'yes',
    values: ['a'],
    constructor: 'Metadata',
  };
  const { editor, table } = create({
    data: [original],
    columns: [
      { data: 'first:name', title: 'Name' },
      { data: 'postal code', title: 'Postal code' },
      { data: 'choice', title: 'Choice', type: 'radio' },
      { data: 'values[, ]', title: 'Values' },
      { data: 'constructor', title: 'Metadata' },
    ],
  });
  expect(() => editor.openEditDialog(0)).not.toThrow();
  const form = $(editor.modal_selector).find('form');
  expect(form.find('[name="postal code"]').val()).toBe('0123');
  expect(form.find('[type="radio"]')).toHaveLength(0);
  expect(form.find('[name="constructor"]')).toHaveLength(0);
  form.find('[name="first:name"]').val('Ann');
  await editor._editRowData();
  expect(table.row(0).data()).toEqual({ ...original, 'first:name': 'Ann' });
  expect(original['first:name']).toBe('Alice');
});

test('renders field constraints and collects only enabled form values', async () => {
  const { editor } = create({
    data: [],
    columns: [
      { data: 'id', title: 'ID', type: 'hidden', value: 0 },
      {
        data: 'notes',
        title: '<b>Notes</b>',
        type: 'textarea',
        value: 'First\nSecond',
        rows: 3,
        required: true,
        style: { color: 'red' },
        special: 'note',
      },
      {
        data: 'role',
        title: 'Role',
        type: 'select',
        options: [
          { id: 'a', text: '<Admin>' },
          { value: 'b', label: 'Reader' },
        ],
        value: 'b',
        placeholder: 'Choose',
        required: true,
        unique: true,
      },
      {
        data: 'enabled',
        title: 'Enabled',
        type: 'checkbox',
        value: 'yes',
        inline: true,
      },
      { data: 'secret', title: 'Secret', visible: false, value: 'hidden text' },
      { data: 'locked', title: 'Locked', disabled: true, value: 'excluded' },
      { data: 'fixed', title: 'Fixed', readonly: true, value: 'retained' },
      { data: 'omitted', title: 'Omitted', editable: false, value: 'excluded' },
      { data: 'empty', title: '' },
    ],
  });
  editor.openAddDialog();
  const form = $(editor.modal_selector).find('form');
  expect(form.find('textarea').val()).toBe('First\nSecond');
  expect(form.find('textarea')[0].style.color).toBe('red');
  expect(form.find('textarea').attr('data-special')).toBe('note');
  expect(form.find('label[for="notes"]').text()).toBe('Notes:');
  expect(form.find('option').first().text()).toBe('<Admin>');
  expect(form.find('[name="fixed"]').prop('readOnly')).toBe(true);
  expect(form.find('.nonDisplay [name="secret"]').val()).toBe('hidden text');
  expect(editor._validateFormData(form)).toEqual([]);
  expect(await editor._collectFormData(form)).toEqual({
    id: '0',
    notes: 'First\nSecond',
    role: 'b',
    enabled: true,
    secret: 'hidden text',
    fixed: 'retained',
  });
});

test.each([
  [
    {
      responseJSON: {
        errors: {
          name: ['Invalid name', null],
          age: 'Invalid age',
          empty: undefined,
        },
      },
    },
    'Invalid name\nInvalid age',
  ],
  [{ responseJSON: { errors: {} } }, 'There was an unknown error!'],
  [{ responseText: '<b>Unavailable</b>' }, '<b>Unavailable</b>'],
  [{ status: 503 }, 'Response code: 503'],
  [undefined, 'There was an unknown error!'],
])(
  'renders server failure details safely and permits retry (%j)',
  async (failure, message) => {
    const { editor, table } = create({
      onAddRow: (_editor, _values, _success, error) => error(failure),
    });
    editor.openAddDialog();
    $(editor.modal_selector).find('[name="name"]').val('Carol');
    await editor._addRowData();
    const alert = $(editor.modal_selector).find('.alert');
    expect(alert.find('span').text()).toBe(message);
    expect(alert.find('b')).toHaveLength(0);
    expect(editor._submitting).toBe(false);
    expect(table.rows().count()).toBe(2);
  }
);

test.each(['', 'not JSON', '{invalid', 'null'])(
  'rejects an invalid persisted row: %s',
  async (response) => {
    const { editor, table } = create({
      onEditRow: (_editor, _values, success) => success(response),
    });
    editor.openEditDialog(0);
    await editor._editRowData();
    expect(table.row(0).data().name).toBe('Alice');
    expect($(editor.modal_selector).find('.alert').text()).toContain(
      'Persistence must return a row'
    );
    expect(editor._submitting).toBe(false);
  }
);

test('accepts JSON persistence responses and ignores completion after a dialog closes', async () => {
  let accept;
  const { editor, table } = create({
    onEditRow: (_editor, _values, success) => {
      accept = success;
    },
  });
  editor.openEditDialog(0);
  await editor._editRowData();
  accept('{"id":"a","name":"Ann"}');
  expect(table.row(0).data().name).toBe('Ann');
  editor.openEditDialog(0);
  await editor._editRowData();
  $(editor.modal_selector).trigger('hidden.bs.modal');
  accept({ id: 'a', name: 'Late' });
  expect(table.row(0).data().name).toBe('Ann');
});

test('requires valid selection and rejects deletion when a captured row disappears', async () => {
  const { editor, table } = create();
  editor.openEditDialog();
  expect($('.altEditor-message').text()).toContain('Exactly one row');
  editor.openDeleteDialog();
  expect($('.altEditor-message').text()).toContain('At least one row');
  editor.openDeleteDialog([0, 1]);
  table.row(1).remove();
  await editor._deleteRow();
  expect(table.rows().count()).toBe(1);
  expect(editor._submitting).toBe(false);
  expect($(editor.modal_selector).find('.alert').text()).toContain(
    'Target row is unavailable'
  );
});

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
  await flush();
  expect(
    table
      .rows()
      .data()
      .toArray()
      .map((row) => row.id)
  ).toEqual(['a', 'c']);
});

test('keeps callback errors editable and renders error text safely', async () => {
  const callback = vi.fn((_editor, _row, success, error) =>
    error(new Error('<img src=x onerror=alert(1)>'))
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
    'Create item'
  );
  table.destroy();
  tables.pop();
  expect(document.querySelector(editor.modal_selector)).toBeNull();
});

test('supports cancelable submission, duplicate settlement and retry after failure', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  let reject = true;
  const callback = vi.fn((_editor, values, success, error) => {
    if (reject) {
      error(new Error('Unavailable'));
      success(values);
    } else {
      success(values);
      success(values);
      error(new Error('Late error'));
      throw new Error('Callback failed');
    }
  });
  const { editor, table } = create({ onEditRow: callback, debug: true });
  editor.openEditDialog(0);
  $(editor.modal_selector).find('[name="name"]').val('Ann');
  $(table.table().node()).one('alteditor-pre-submit.dt', (event) =>
    event.preventDefault()
  );
  await editor._editRowData();
  expect(callback).not.toHaveBeenCalled();
  await editor._editRowData();
  expect(table.row(0).data().name).toBe('Alice');
  reject = false;
  await editor._editRowData();
  expect(table.row(0).data().name).toBe('Ann');
  expect(editor._submitting).toBe(false);
  expect(log).toHaveBeenCalledOnce();
});

test('rejects a removed target and keeps delete failures retryable', async () => {
  let reject = true;
  const { editor, table } = create({
    onDeleteRow: (_editor, rows, success, error) =>
      reject ? error('Unavailable') : success(rows),
  });
  editor.openDeleteDialog(0);
  await editor._deleteRow();
  expect(table.rows().count()).toBe(2);
  expect(editor._submitting).toBe(false);
  reject = false;
  await editor._deleteRow();
  expect(table.rows().count()).toBe(1);
  editor.openEditDialog(1);
  table.row(1).remove();
  table.row.add({ id: 'c', name: 'Carol' }).draw();
  await editor._editRowData();
  expect(table.rows().data().toArray()).toEqual([{ id: 'c', name: 'Carol' }]);
});

test('uses uniqueMsg and handles encoded files, read failures and aborts', async () => {
  const { editor, table } = create({
    columns: [
      {
        data: 'name',
        title: 'Name',
        unique: true,
        uniqueMsg: 'Name already exists',
      },
      { data: 'attachment', title: 'File', type: 'file', defaultContent: '' },
    ],
  });
  editor.openAddDialog();
  const form = $(editor.modal_selector).find('form');
  form.find('[name="name"]').val('Alice');
  expect(editor._validateFormData(form)).toContain('Name already exists');
  form.find('[name="name"]').val('Carol');
  const file = new File(['hello'], 'hello.txt');
  Object.defineProperty(form.find('[type="file"]')[0], 'files', {
    value: [file],
    configurable: true,
  });
  const values = await editor._collectFormData(form);
  expect(values.attachment).toContain('base64,aGVsbG8=');
  editor.encodeFiles = false;
  expect((await editor._collectFormData(form)).attachment).toBe(file);
  editor.encodeFiles = true;
  for (const event of ['error', 'abort']) {
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(
      function () {
        this.dispatchEvent(new Event(event));
      }
    );
    await editor._addRowData();
    expect(editor._submitting).toBe(false);
    expect(table.rows().count()).toBe(2);
    vi.restoreAllMocks();
  }
});

test('loads language from a URL and ignores persistence after destroy', async () => {
  vi.spyOn($, 'ajax').mockImplementation((options) => {
    options.success({ add: { title: 'Create item' } });
    return { abort() {} };
  });
  let success;
  const { editor, table } = create({
    language: { altEditorUrl: '/language.json' },
    onAddRow: (_editor, _values, accept) => {
      success = accept;
    },
  });
  editor.openAddDialog();
  expect($(editor.modal_selector).find('.modal-title').text()).toBe(
    'Create item'
  );
  $(editor.modal_selector).find('[name="name"]').val('Carol');
  await editor._addRowData();
  editor.destroy();
  success({ name: 'Carol' });
  expect(table.rows().count()).toBe(2);
});

test('restores application toolbar actions when the editor is destroyed', () => {
  const action = vi.fn();
  const { editor, table } = create({
    layout: { topStart: 'buttons' },
    buttons: [{ name: 'add', text: 'Add', action }],
  });
  editor.destroy();
  table.button('add:name').trigger();
  expect(action).toHaveBeenCalledOnce();
});

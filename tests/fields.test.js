import $ from 'jquery';
import DataTable from 'datatables.net';
import '../src/index.js';
import { afterEach, expect, test, vi } from 'vitest';

const tables = [];
function create(fields, options = {}) {
  const node = document.createElement('table');
  document.body.appendChild(node);
  const table = new DataTable(node, {
    data: [
      {
        id: 'a',
        name: 'Alice',
        roles: [{ id: 1, label: 'Reader' }],
        profile: { score: 2, active: true },
      },
    ],
    rowId: 'id',
    columns: [{ data: 'name', title: 'Name', visible: false }],
    altEditor: { fields },
    closeModalOnSuccess: false,
    ...options,
  });
  tables.push(table);
  const editor = node.altEditor;
  editor.internalOpenDialog = (_selector, fill) => fill();
  return { editor, table, form: () => $(editor.modal_selector).find('form') };
}

afterEach(() => {
  tables.splice(0).forEach((table) => table.destroy());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

test('edits independent fields with structured read and write conversions', async () => {
  const validate = vi.fn(() => true);
  const save = vi.fn((_editor, _values, success) => success());
  const { editor, table, form } = create(
    [
      {
        name: 'roles',
        title: 'Roles',
        type: 'select',
        multiple: true,
        options: [
          { id: 1, text: 'Reader' },
          { id: 2, text: 'Writer' },
        ],
        getValue: (roles) => roles.map((role) => role.id),
        setValue: (ids, context) => {
          context.originalRowData.profile.active = false;
          return ids.map((id) => ({
            id: Number(id),
            label: id === '1' ? 'Reader' : 'Writer',
          }));
        },
        editorValidate: validate,
      },
      {
        name: 'profile.score',
        title: 'Score',
        type: 'number',
        setValue: Number,
      },
      { name: 'name', title: 'Full name' },
    ],
    { onEditRow: save }
  );
  const original = table.row(0).data();
  editor.openEditDialog(0);
  expect(form().find('select').val()).toEqual(['1']);
  expect(
    form()
      .find('[name="name"]')
      .closest('.altEditor-field')
      .hasClass('nonDisplay')
  ).toBe(false);
  form().find('select').val(['1', '2']);
  form().find('[name="profile.score"]').val('5');
  await editor._editRowData();
  expect(validate.mock.calls[0][0]).toEqual(['1', '2']);
  expect(validate.mock.calls[0][1].values.profile.score).toBe('5');
  expect(save.mock.calls[0][1]).toEqual({
    roles: [
      { id: 1, label: 'Reader' },
      { id: 2, label: 'Writer' },
    ],
    profile: { score: 5 },
    name: 'Alice',
  });
  expect(table.row(0).data().profile).toEqual({ score: 5, active: true });
  expect(table.row(0).data().id).toBe('a');
  expect(original.profile).toEqual({ score: 2, active: true });
  expect(original.roles).toHaveLength(1);
});

test('uses independent add defaults and omits disabled fields from conversions', async () => {
  const disabled = vi.fn();
  const { editor, table } = create([
    { name: 'name', value: 'Carol' },
    { name: 'profile.score', value: 4, getValue: String, setValue: Number },
    { name: 'secret', disabled: true, value: 'private', setValue: disabled },
  ]);
  editor.openAddDialog();
  await editor._addRowData();
  expect(table.rows().data().toArray()).toContainEqual({
    name: 'Carol',
    profile: { score: 4 },
  });
  expect(disabled).not.toHaveBeenCalled();
});

test('reports conversion errors on the field and allows correction', async () => {
  const save = vi.fn((_editor, _values, success) => success());
  const { editor, form } = create(
    [
      {
        name: 'name',
        setValue: (value) => {
          if (value === 'invalid') throw new Error('Choose another name');
          return value.trim();
        },
      },
    ],
    { onEditRow: save }
  );
  editor.openEditDialog(0);
  form().find('input').val('invalid');
  await editor._editRowData();
  expect(save).not.toHaveBeenCalled();
  expect(form().find('input').attr('aria-invalid')).toBe('true');
  expect(form().text()).toContain('Choose another name');
  form().find('input').val(' Ann ').trigger('input');
  await editor._editRowData();
  expect(save.mock.calls[0][1]).toEqual({ name: 'Ann' });
});

test('checks unique independent fields using their read conversion', async () => {
  const { editor, table, form } = create([
    {
      name: 'profile.score',
      unique: true,
      type: 'number',
      getValue: (value) => value * 10,
    },
  ]);
  table.row.add({ id: 'b', name: 'Bob', profile: { score: 3 } });
  editor.openEditDialog(0);
  const input = form().find('input')[0];
  expect(input.value).toBe('20');
  expect(input.checkValidity()).toBe(true);
  input.value = '30';
  await editor._editRowData();
  expect(input.checkValidity()).toBe(false);
  expect(table.row(0).data().profile.score).toBe(2);
});

test('retains column-based configuration and applies explicit conversions', async () => {
  const { editor, table, form } = create(undefined, {
    columns: [
      {
        data: 'profile.score',
        title: 'Score',
        getValue: (value) => value * 10,
        setValue: (value) => Number(value) / 10,
      },
    ],
  });
  editor.openEditDialog(0);
  expect(form().find('input').val()).toBe('20');
  form().find('input').val('50');
  await editor._editRowData();
  expect(table.row(0).data().profile).toEqual({ score: 5, active: true });
});

test.each(
  [
    [{ name: 'name' }, { name: 'name' }],
    [{ name: 'profile' }, { name: 'profile.score' }],
    [{ name: '__proto__.name' }],
    [{ name: 'name', getValue: 'name' }],
  ].map((fields) => [fields])
)('rejects invalid field definitions without changing data (%j)', (fields) => {
  const { editor, table } = create(fields);
  expect(editor.openEditDialog(0)).toBe(false);
  expect(table.row(0).data().name).toBe('Alice');
});

test('reports an asynchronous read conversion as an opening error', () => {
  const { editor } = create([
    { name: 'name', getValue: () => Promise.resolve('Alice') },
  ]);
  expect(editor.openEditDialog(0)).toBe(false);
});

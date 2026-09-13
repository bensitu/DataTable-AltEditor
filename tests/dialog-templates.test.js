import $ from 'jquery';
import DataTable from 'datatables.net';
import '../src/index.js';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

let table;
const originalModal = $.fn.modal;
beforeEach(() => {
  $.fn.modal = function (action) {
    if (action === 'show') this.trigger('shown.bs.modal');
    if (action === 'hide') this.trigger('hidden.bs.modal');
    return this;
  };
});
afterEach(() => {
  table?.destroy();
  table = undefined;
  $.fn.modal = originalModal;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});
function create(dialog = {}) {
  document.body.insertAdjacentHTML('beforeend', '<table id="table"></table>');
  table = new DataTable('#table', {
    data: [
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ],
    rowId: 'id',
    columns: [
      { data: 'id', title: 'ID', type: 'hidden', value: 'new' },
      { data: 'name', title: 'Name', required: true, value: 'New name' },
    ],
    altEditor: { dialog },
  });
  return table.altEditor();
}
test('clones separate add and edit layouts while retaining defaults, validation and persistence', async () => {
  document.body.innerHTML =
    '<template id="add"><section aria-labelledby="profile-heading"><h2 id="profile-heading">Create profile</h2><div data-alteditor-field="name"></div></section></template><template id="edit"><fieldset><legend>Change profile</legend><div data-alteditor-field="name"></div></fieldset></template>';
  const render = vi.fn();
  const editor = create({
    templates: {
      add: '#add',
      edit: ({ action }) => (action === 'edit' ? '#edit' : null),
    },
    onRender: render,
  });
  editor.openAddDialog();
  const modal = $(editor.modal_selector);
  expect(modal.find('h2').text()).toBe('Create profile');
  expect(modal.find('section').attr('aria-labelledby')).toBe(
    modal.find('h2').attr('id')
  );
  expect(modal.find('h2').attr('id')).not.toBe('profile-heading');
  expect(modal.find('[name="name"]').val()).toBe('New name');
  modal.find('[name="name"]').val('');
  await editor._addRowData();
  expect(table.rows().count()).toBe(2);
  modal.find('[name="name"]').val('Carol');
  await editor._addRowData();
  expect(table.row('#new').data()).toEqual({ id: 'new', name: 'Carol' });
  editor.openEditDialog('#a');
  expect(modal.find('legend').text()).toBe('Change profile');
  expect(modal.find('[name="name"]').val()).toBe('Alice');
  modal.find('[name="name"]').val('Ann');
  await editor._editRowData();
  expect(table.row('#a').data().name).toBe('Ann');
  editor.openAddDialog();
  expect(modal.find('[name="name"]').val()).toBe('New name');
  expect(
    document.querySelector('#add').content.querySelector('input')
  ).toBeNull();
  expect(render).toHaveBeenCalledTimes(3);
});

test.each([
  '<div></div>',
  '<div data-alteditor-field="unknown"></div>',
  '<div data-alteditor-field="name"></div><div data-alteditor-field="name"></div>',
  '<form><div data-alteditor-field="name"></div></form>',
  '<input name="name">',
])(
  'rejects invalid layouts and permits a corrected configuration',
  (markup) => {
    const template = document.createElement('template');
    template.innerHTML = markup;
    const editor = create({ templates: { add: template } });
    const failure = vi.fn();
    table.on('alteditor-error.dt', failure);
    expect(editor.openAddDialog()).toBe(false);
    expect(editor._dialogOpen).toBeFalsy();
    expect(failure).toHaveBeenCalledOnce();
    editor.c.dialog.templates.add = null;
    editor.openAddDialog();
    expect(editor._dialogOpen).toBe(true);
  }
);

test('passes detached deletion rows and supports text, DOM, and hidden details', () => {
  const editor = create({
    deleteDetails: ({ rows }) => {
      rows[0].name = '<img src=x onerror=alert(1)>';
      return rows.map((row) => row.name).join(', ');
    },
  });
  editor.openDeleteDialog([0, 1]);
  const modal = $(editor.modal_selector);
  expect(modal.find('.altEditor-delete-details').text()).toContain('<img');
  expect(modal.find('img')).toHaveLength(0);
  expect(table.row(0).data().name).toBe('Alice');
  editor.internalCloseDialog(editor.modal_selector);
  const clicked = vi.fn();
  editor.c.dialog.deleteDetails = ({ rows }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = rows[0].name;
    button.addEventListener('click', clicked);
    return button;
  };
  editor.openDeleteDialog(1);
  modal.find('.altEditor-delete-details button')[0].click();
  expect(clicked).toHaveBeenCalledOnce();
  editor.internalCloseDialog(editor.modal_selector);
  editor.c.dialog.deleteDetails = false;
  editor.openDeleteDialog(0);
  expect(modal.find('.altEditor-delete-details')).toHaveLength(0);
});

test('supports cancellation and prevents reentrant opening from lifecycle callbacks', () => {
  const editor = create({ onBeforeOpen: () => false });
  expect(editor.openAddDialog()).toBe(false);
  editor.c.dialog.onBeforeOpen = () => {
    expect(editor.openAddDialog()).toBe(false);
  };
  table.one('alteditor-before-open.dt', (event) => event.preventDefault());
  expect(editor.openAddDialog()).toBe(false);
  editor.c.dialog.onRender = ({ form }) => {
    expect(form.querySelector('[name="name"]').value).toBe('Alice');
    expect(editor.openAddDialog()).toBe(false);
  };
  editor.openEditDialog(0);
  expect(editor._action).toBe('edit');
  editor.c.dialog.onClose = vi.fn();
  editor.internalCloseDialog(editor.modal_selector);
  expect(editor.c.dialog.onClose).toHaveBeenCalledOnce();
  editor.c.dialog.onBeforeOpen = () => editor.destroy();
  expect(editor.openAddDialog()).toBe(false);
});

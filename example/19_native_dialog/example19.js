let nextId = 2;
const table = new DataTable('#example', {
  data: [{ id: '1', name: 'Alice', email: 'alice@example.com' }],
  rowId: 'id',
  columns: [
    { data: 'id', title: 'ID', type: 'hidden' },
    {
      data: 'name',
      title: 'Name',
      required: true,
      render: DataTable.render.text(),
    },
    {
      data: 'email',
      title: 'Email',
      type: 'email',
      render: DataTable.render.text(),
    },
  ],
  altEditor: {
    dialog: {
      framework: 'native',
      templates: { add: '#person-fields', edit: '#person-fields' },
      deleteDetails: ({ rows }) => 'Selected person: ' + rows[0].name,
    },
  },
  onAddRow(editor, values, success) {
    success({ ...values, id: String(nextId++) });
  },
});
const editor = table.altEditor();
document
  .querySelector('#add-person')
  .addEventListener('click', () => editor.openAddDialog());
document
  .querySelector('#edit-alice')
  .addEventListener('click', () => editor.openEditDialog('#1'));
document
  .querySelector('#delete-alice')
  .addEventListener('click', () => editor.openDeleteDialog('#1'));
table.on('draw', () => {
  const missing = !table.row('#1').any();
  document.querySelector('#edit-alice').disabled = missing;
  document.querySelector('#delete-alice').disabled = missing;
});
const supported =
  typeof document.createElement('dialog').showModal === 'function';
document.querySelector('#result').textContent = supported
  ? 'The browser supports native dialogs. Use Close to cancel.'
  : 'This browser does not support native dialogs. Use the Bootstrap or Foundation examples.';
if (!supported) {
  document.querySelectorAll('.example-actions button').forEach((button) => {
    button.disabled = true;
  });
}

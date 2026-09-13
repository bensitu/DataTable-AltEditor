const table = new DataTable('#example', {
  data: [
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' },
  ],
  rowId: 'id',
  columns: [
    { data: 'id', title: 'ID', readonly: true },
    {
      data: 'name',
      title: 'Name',
      required: true,
      render: DataTable.render.text(),
    },
  ],
  select: 'multi',
  layout: { topStart: 'buttons' },
  buttons: [
    { name: 'edit', text: 'Edit', extend: 'selectedSingle' },
    { name: 'delete', text: 'Delete', extend: 'selected' },
  ],
  altEditor: { closeModalOnSuccess: false },
  onDeleteRow(editor, rows, success) {
    document.querySelector('#result').textContent =
      'Deleted IDs: ' + rows.map((row) => row.id).join(', ');
    success();
  },
});

$(table.table().node()).on('alteditor-close.dt', function () {
  document.querySelector('#result').textContent += ' Dialog closed.';
});

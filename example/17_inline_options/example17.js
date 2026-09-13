const table = new DataTable('#example', {
  data: [
    { id: 'a', person: { name: 'Alice' }, budget: 100, enabled: true },
    { id: 'b', person: { name: 'Bob' }, budget: 200, enabled: false },
  ],
  rowId: 'id',
  columns: [
    {
      data: (row) => row.person.name,
      title: 'Name',
      render: DataTable.render.text(),
      required: true,
      inlineEditSetValue(row, value) {
        row.person.name = value;
        return row;
      },
    },
    {
      data: 'budget',
      title: 'Budget',
      render: DataTable.render.number(',', '.', 2, '$'),
      inlineEditType: 'number',
      inlineEditOptions: { min: 0, max: 10000, step: 0.01, required: true },
    },
    {
      data: 'enabled',
      title: 'Enabled',
      inlineEditType: 'checkbox',
      render: (value, type) =>
        type === 'display' ? (value ? 'Yes' : 'No') : value,
    },
  ],
  altEditor: { inlineEdit: { enabled: true, submitOnBlur: true } },
});

const editor = table.altEditor();
document.querySelector('#start').addEventListener('click', () => {
  table.search('').order([]).page('first').draw(false);
  editor.startInlineEdit({ row: table.row('#a').index(), column: 0 });
});

// Keep the active input focused until the explicit save or cancel action runs.
for (const id of ['save', 'cancel']) {
  document
    .querySelector('#' + id)
    .addEventListener('pointerdown', (event) => event.preventDefault());
}
document
  .querySelector('#save')
  .addEventListener('click', () => editor.commitInlineEdit());
document
  .querySelector('#cancel')
  .addEventListener('click', () => editor.cancelInlineEdit());
$(table.table().node()).on(
  'alteditor-inline-open.dt alteditor-inline-close.dt',
  () => {
    document.querySelector('#result').textContent = editor.isInlineEditing()
      ? 'Editing. Leaving the input saves it; use Cancel cell to discard it.'
      : 'No active cell.';
  }
);

$(document).ready(function () {
  var columnDefs = [
    {
      data: 'id',
      title: 'Id',
      type: 'readonly',
      render: DataTable.render.text(),
    },
    {
      data: 'name',
      title: 'Name',
      render: DataTable.render.text(),
    },
    {
      data: 'position',
      title: 'Position',
      render: DataTable.render.text(),
    },
    {
      data: 'office',
      title: 'Office',
      render: DataTable.render.text(),
    },
    {
      data: 'extension',
      title: 'Extn.',
      render: DataTable.render.text(),
    },
    {
      data: 'startDate',
      title: 'Start date',
      render: DataTable.render.text(),
    },
    {
      data: 'salary',
      title: 'Salary',
      render: DataTable.render.text(),
    },
  ];

  var myTable;

  var loadUrl = './mock_svc_load.json';

  myTable = $('#example').DataTable({
    rowId: 'id',
    pagingType: 'full_numbers',
    ajax: {
      url: loadUrl,
      // The response is a JSON array rather than an object with a data property.
      dataSrc: '',
    },
    columns: columnDefs,
    layout: { topStart: 'buttons' },
    select: 'single',
    responsive: true,
    altEditor: true, // Enable altEditor
    buttons: [
      {
        text: 'Add',
        name: 'add', // do not change name
      },
      {
        extend: 'selected', // Bind to Selected row
        text: 'Edit',
        name: 'edit', // do not change name
      },
      {
        extend: 'selected', // Bind to Selected row
        text: 'Delete',
        name: 'delete', // do not change name
      },
      {
        text: 'Refresh',
        name: 'refresh', // do not change name
      },
    ],
    // Changes are applied locally. Use a write endpoint for server persistence.
    onAddRow: function (editor, values, success) {
      const rows = editor.api().rows().data().toArray();
      values.id =
        rows.reduce((maximum, row) => Math.max(maximum, Number(row.id) || 0), 0) + 1;
      success();
    },
    onDeleteRow: function (_editor, _values, success) {
      success();
    },
    onEditRow: function (_editor, _values, success) {
      success();
    },
  });
});

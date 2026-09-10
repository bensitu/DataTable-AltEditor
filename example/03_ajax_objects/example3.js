$(document).ready(function () {
  var columnDefs = [
    {
      data: 'id',
      title: 'Id',
      type: 'readonly',
    },
    {
      data: 'name',
      title: 'Name',
    },
    {
      data: 'position',
      title: 'Position',
    },
    {
      data: 'office',
      title: 'Office',
    },
    {
      data: 'extension',
      title: 'Extn.',
    },
    {
      data: 'startDate',
      title: 'Start date',
    },
    {
      data: 'salary',
      title: 'Salary',
    },
  ];

  var myTable;

  var loadUrl = './mock_svc_load.json';
  // Static JSON simulates a successful save. Production code must use a write endpoint.
  var saveUrl = './mock_svc_ok.json';

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
    onAddRow: function (editor, values, success, error) {
      values.id =
        Math.max(
          0,
          ...editor
            .api()
            .rows()
            .data()
            .toArray()
            .map(function (row) {
              return Number(row.id) || 0;
            })
        ) + 1;
      $.ajax({
        url: saveUrl,
        type: 'GET',
        success: function () {
          success();
        },
        error: error,
      });
    },
    onDeleteRow: function (editor, values, success, error) {
      $.ajax({
        url: saveUrl,
        type: 'GET',
        success: function () {
          success();
        },
        error: error,
      });
    },
    onEditRow: function (editor, values, success, error) {
      $.ajax({
        url: saveUrl,
        type: 'GET',
        success: function () {
          success();
        },
        error: error,
      });
    },
  });
});

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
  var saveUrl = './mock_svc_ok.json';

  myTable = $('#example').DataTable({
    pagingType: 'full_numbers',
    ajax: {
      url: loadUrl,
      // our data is an array of objects, in the root node instead of /data node, so we need 'dataSrc' parameter
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
    onAddRow: function (datatable, rowdata, success, error) {
      rowdata.id =
        Math.max(
          0,
          ...datatable
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
        data: rowdata,
        success: function () {
          success();
        },
        error: error,
      });
    },
    onDeleteRow: function (datatable, rowdata, success, error) {
      $.ajax({
        url: saveUrl,
        type: 'GET',
        data: rowdata,
        success: function () {
          success();
        },
        error: error,
      });
    },
    onEditRow: function (datatable, rowdata, success, error) {
      $.ajax({
        url: saveUrl,
        type: 'GET',
        data: rowdata,
        success: function () {
          success();
        },
        error: error,
      });
    },
  });
});

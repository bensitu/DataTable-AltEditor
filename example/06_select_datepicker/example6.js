var employeeOptions = { 1: 'Employee', 2: 'Official', 3: 'Director' };
var friendsOptions = { G: 'Goofy', DD: 'Donald duck', M: 'Mickey', D: 'Daisy' };
var degreesOptions = { 0: 'None', 1: 'Degree', 2: 'High school' };

$(document).ready(function () {
  var columnDefs = [
    {
      data: 'id',
      title: 'Id',
      type: 'text',
      readonly: true,
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
      type: 'select',
      options: employeeOptions,
      select2: { width: '100%' },
      render: function (data, type, row, meta) {
        if (data == null || !(data in employeeOptions)) return null;
        return employeeOptions[data];
      },
    },
    {
      data: 'startDate',
      title: 'Start date',
      datetimepicker: { timepicker: false, format: 'Y/m/d' },
      render: DataTable.render.text(),
    },
    {
      data: 'creationTimestamp',
      title: 'Creation timestamp',
      datetimepicker: { timepicker: true, format: 'Y-m-d H:i:s' },
      render: DataTable.render.text(),
    },
    {
      data: 'friends',
      title: 'Friends',
      type: 'select',
      options: friendsOptions,
      multiple: true,
      select2: { width: '100%' },
      render: function (data, type, row, meta) {
        if (!Array.isArray(data)) return '';
        const labels = data
          .map(function (x) {
            return friendsOptions[x] || x;
          })
          .join(', ');
        return type === 'display' ? DataTable.render.text().display(labels) : labels;
      },
    },
    {
      data: 'degree.id',
      title: 'Degree (nested obj.)',
      type: 'select',
      options: degreesOptions,
      select2: { width: '100%' },
      render: function (data, type, row, meta) {
        return degreesOptions[data] || '';
      },
    },
  ];

  var loadUrl = './mock_svc_load.json';

  $('#example').DataTable({
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

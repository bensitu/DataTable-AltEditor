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
    },
    {
      data: 'name',
      title: 'Name',
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
    },
    {
      data: 'creationTimestamp',
      title: 'Creation timestamp',
      datetimepicker: { timepicker: true, format: 'Y-m-d H:i:s' },
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
        return data
          .map(function (x) {
            return friendsOptions[x] || x;
          })
          .join(', ');
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
  // Static JSON simulates a successful save. Production code must use a write endpoint.
  var saveUrl = './mock_svc_ok.json';

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
        // A production endpoint should return the persisted row.
        url: saveUrl,
        type: 'GET',
        success: function () {
          // Static responses acknowledge the request; retain the submitted values.
          success();
        },
        error: error,
      });
    },
    onDeleteRow: function (editor, values, success, error) {
      $.ajax({
        // A production endpoint should delete the requested rows.
        url: saveUrl,
        type: 'GET',
        success: function () {
          // Static responses acknowledge the request; retain the submitted values.
          success();
        },
        error: error,
      });
    },
    onEditRow: function (editor, values, success, error) {
      $.ajax({
        // A production endpoint should return the persisted row.
        url: saveUrl,
        type: 'GET',
        success: function () {
          // Static responses acknowledge the request; retain the submitted values.
          success();
        },
        error: error,
      });
    },
  });
});

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
      data: 'imagelink',
      defaultContent: '',
      title: 'Avatar (direct link)',
      render: function (data, type) {
        if (type !== 'display') return data || '';
        if (!data) return '';
        const link = document.createElement('a');
        link.href = data;
        link.download = 'avatar.svg';
        const image = document.createElement('img');
        image.src = data;
        image.alt = 'Download sample avatar';
        image.width = 64;
        image.height = 64;
        link.append(image);
        return link;
      },
      editable: false,
    },
    {
      data: 'image',
      defaultContent: '',
      title: 'File (data URL)',
      type: 'file',
      render: function (data, type) {
        if (type !== 'display') return data ? 'File attached' : '';
        if (typeof data !== 'string' || !/^data:[^,]*;base64,/.test(data))
          return 'No file';
        const link = document.createElement('a');
        link.href = data;
        link.download = 'attachment';
        link.textContent = 'Download file';
        return link;
      },
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

        success: function () {
          success();
        },
        error: error,
      });
    },
  });
});

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
      data: 'imagelink',
      defaultContent: '',
      title: 'Avatar (direct link)',
      render: function (data, type) {
        if (type !== 'display') return data || '';
        if (!data) return '';
        let url;
        try {
          url = new URL(data, document.baseURI);
        } catch (_error) {
          return '';
        }
        if (!['http:', 'https:'].includes(url.protocol)) return '';
        const link = document.createElement('a');
        link.href = url.href;
        link.download = 'avatar.svg';
        const image = document.createElement('img');
        image.src = url.href;
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
      required: true,
      maxFileSize: 2 * 1024 * 1024,
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

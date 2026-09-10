var dataUrl = './';

var countryOptions = ['Italy', 'France', 'Germany'];
var allTownsOptions = [
  'Torino',
  'Roma',
  'Milano',
  'Napoli',
  'Paris',
  'Lyon',
  'Toulouse',
];

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
      data: 'country',
      title: 'Country',
      type: 'select',
      options: countryOptions,
      value: 'Italy',
      select2: { width: '100%' },
      editorOnChange: function (event, editor) {
        const country = event.currentTarget.value;
        const modal = $(event.target).closest('.altEditor-modal');
        const town = modal.find('[name="town"]');
        let message = modal.find('#town-label');
        if (!message.length) {
          message = $('<div>', { id: 'town-label', role: 'status' }).appendTo(
            town.parent()
          );
          town.attr('aria-describedby', 'town-label');
        }
        const previousRequest = town.data('options-request');
        if (previousRequest) previousRequest.abort();
        message.text('');
        const hasTowns = country === 'Italy' || country === 'France';
        modal.find('#alteditor-row-town').toggle(hasTowns);
        town.prop('required', hasTowns);
        if (!hasTowns) {
          editor.reloadOptions(town, ['']);
          town.val('').trigger('change');
          town[0].setCustomValidity('');
          return;
        }
        town[0].setCustomValidity('Wait for the towns to load.');
        const request = $.ajax({
          url:
            dataUrl +
            (country === 'Italy'
              ? 'mock_svc_italy.json'
              : 'mock_svc_france.json'),
          dataType: 'json',
          success: function (options) {
            if (!town[0].isConnected || event.currentTarget.value !== country)
              return;
            editor.reloadOptions(town, options);
            if (town.val() === null) town.val(options[0]).trigger('change');
            town[0].setCustomValidity('');
          },
          error: function (_request, status) {
            if (status === 'abort' || !town[0].isConnected) return;
            const text =
              'Unable to load towns. Select the country again to retry.';
            town[0].setCustomValidity(text);
            message.text(text);
          },
        });
        town.data('options-request', request);
      },
    },
    {
      data: 'town',
      title: 'Town',
      type: 'select',
      options: allTownsOptions,
      select2: { width: '100%' },
    },
  ];

  var myTable;
  myTable = $('#example').DataTable({
    rowId: 'id',
    pagingType: 'full_numbers',
    ajax: {
      url: dataUrl + 'mock_svc_load.json',
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
      // Static JSON simulates persistence; production code must use a write endpoint.
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
        url: dataUrl + 'mock_svc_ok.json',
        type: 'GET',
        success: function () {
          success();
        },
        error: error,
      });
    },
    onDeleteRow: function (editor, values, success, error) {
      $.ajax({
        url: dataUrl + 'mock_svc_ok.json',
        type: 'GET',
        success: function () {
          success();
        },
        error: error,
      });
    },
    onEditRow: function (editor, values, success, error) {
      $.ajax({
        url: dataUrl + 'mock_svc_ok.json',
        type: 'GET',
        success: function () {
          success();
        },
        error: error,
      });
    },
  });
});

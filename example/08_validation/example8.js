$(document).ready(function () {
  var dataSet = [
    [
      1,
      'Tiger Nixon',
      'System Architect',
      'Edinburgh',
      '5421',
      '2011-04-25',
      '$320,800',
      1,
      '1',
    ],
    [
      2,
      'Garrett Winters',
      'Accountant',
      'Tokyo',
      '8422',
      '2011-07-25',
      '$170,750',
      2,
      '2',
    ],
    [
      3,
      'Ashton Cox',
      'Junior Technical Author',
      'San Francisco',
      '1562',
      '2009-01-12',
      '$86,000',
      3,
      '3',
    ],
    [
      4,
      'Cedric Kelly',
      'Senior Javascript Developer',
      'Edinburgh',
      '6224',
      '2012-03-29',
      '$433,060',
      4,
      '4',
    ],
    [
      5,
      'Airi Satou',
      'Accountant',
      'Tokyo',
      '5407',
      '2008-11-28',
      '$162,700',
      5,
      '5',
    ],
    [
      6,
      'Brielle Williamson',
      'Integration Specialist',
      'New York',
      '4804',
      '2012-12-02',
      '$372,000',
      6,
      '6',
    ],
  ];

  var columnDefs = [
    {
      title: 'Id',
      type: 'readonly',
      render: DataTable.render.text(),
    },
    {
      title: 'Name',
      type: 'text',
      required: true,
      unique: true,
      render: DataTable.render.text(),
    },
    {
      title: 'Position',
      required: true,
      type: 'text',
      render: DataTable.render.text(),
    },
    {
      title: 'Office',
      render: DataTable.render.text(),
      //no type = text
    },
    {
      title: 'Extn.',
      type: 'number',
      render: DataTable.render.text(),
    },
    {
      title: 'Start date',
      type: 'date',
      render: DataTable.render.text(),
    },
    {
      title: 'Salary',
      type: 'text',
      pattern: '\\$[1-9][0-9]{0,2}(,[0-9]{3})+',
      hoverMsg: 'At least $1,000',
      render: DataTable.render.text(),
    },
    {
      title: 'Unique number',
      type: 'number',
      unique: true,
      render: DataTable.render.text(),
    },
    {
      title: 'Select unique',
      type: 'select',
      select2: {
        allowClear: true,
        placeholder: 'Choose an option',
        width: '100%',
      },
      options: ['1', '2', '3', '4', '5', '6', '7', '8'],
      unique: true,
      render: DataTable.render.text(),
    },
  ];

  var myTable;

  myTable = $('#example').DataTable({
    pagingType: 'full_numbers',
    data: dataSet,
    columns: columnDefs,
    onAddRow: function (editor, values, success) {
      const rows = editor.api().rows().data().toArray();

      values[0] =
        rows.reduce((maximum, row) => Math.max(maximum, Number(row[0]) || 0), 0) + 1;
      success();
    },
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
    ],
  });
});

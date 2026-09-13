$(document).ready(function () {
  var dataSet = [
    {
      id: 1,
      name: 'Tiger Nixon',
      position: 'System Architect',
      office: 'Edinburgh',
      extension: '5421',
      startDate: '2011/04/25',
      salary: '$320,800',
    },
    {
      id: 2,
      name: 'Garrett Winters',
      position: 'Accountant',
      office: 'Tokyo',
      extension: '8422',
      startDate: '2011/07/25',
      salary: '$170,750',
    },
    {
      id: 3,
      name: 'Ashton Cox',
      position: 'Junior Technical Author',
      office: 'San Francisco',
      extension: '1562',
      startDate: '2009/01/12',
      salary: '$86,000',
    },
    {
      id: 4,
      name: 'Cedric Kelly',
      position: 'Senior Javascript Developer',
      office: 'Edinburgh',
      extension: '6224',
      startDate: '2012/03/29',
      salary: '$433,060',
    },
    {
      id: 5,
      name: 'Airi Satou',
      position: 'Accountant',
      office: 'Tokyo',
      extension: '5407',
      startDate: '2008/11/28',
      salary: '$162,700',
    },
    {
      id: 6,
      name: 'Brielle Williamson',
      position: 'Integration Specialist',
      office: 'New York',
      extension: '4804',
      startDate: '2012/12/02',
      salary: '$372,000',
    },
    {
      id: 7,
      name: 'Herrod Chandler',
      position: 'Sales Assistant',
      office: 'San Francisco',
      extension: '9608',
      startDate: '2012/08/06',
      salary: '$137,500',
    },
    {
      id: 8,
      name: 'Rhona Davidson',
      position: 'Integration Specialist',
      office: 'Tokyo',
      extension: '6200',
      startDate: '2010/10/14',
      salary: '$327,900',
    },
    {
      id: 9,
      name: 'Colleen Hurst',
      position: 'Javascript Developer',
      office: 'San Francisco',
      extension: '2360',
      startDate: '2009/09/15',
      salary: '$205,500',
    },
    {
      id: 10,
      name: 'Sonya Frost',
      position: 'Software Engineer',
      office: 'Edinburgh',
      extension: '1667',
      startDate: '2008/12/13',
      salary: '$103,600',
    },
    {
      id: 11,
      name: 'Jena Gaines',
      position: 'Office Manager',
      office: 'London',
      extension: '3814',
      startDate: '2008/12/19',
      salary: '$90,560',
    },
    {
      id: 12,
      name: 'Quinn Flynn',
      position: 'Support Lead',
      office: 'Edinburgh',
      extension: '9497',
      startDate: '2013/03/03',
      salary: '$342,000',
    },
    {
      id: 13,
      name: 'Charde Marshall',
      position: 'Regional Director',
      office: 'San Francisco',
      extension: '6741',
      startDate: '2008/10/16',
      salary: '$470,600',
    },
    {
      id: 14,
      name: 'Haley Kennedy',
      position: 'Senior Marketing Designer',
      office: 'London',
      extension: '3597',
      startDate: '2012/12/18',
      salary: '$313,500',
    },
    {
      id: 15,
      name: 'Tatyana Fitzpatrick',
      position: 'Regional Director',
      office: 'London',
      extension: '1965',
      startDate: '2010/03/17',
      salary: '$385,750',
    },
    {
      id: 16,
      name: 'Michael Silva',
      position: 'Marketing Designer',
      office: 'London',
      extension: '1581',
      startDate: '2012/11/27',
      salary: '$198,500',
    },
    {
      id: 17,
      name: 'Paul Byrd',
      position: 'Chief Financial Officer (CFO)',
      office: 'New York',
      extension: '3059',
      startDate: '2010/06/09',
      salary: '$725,000',
    },
    {
      id: 18,
      name: 'Gloria Little',
      position: 'Systems Administrator',
      office: 'New York',
      extension: '1721',
      startDate: '2009/04/10',
      salary: '$237,500',
    },
    {
      id: 19,
      name: 'Bradley Greer',
      position: 'Software Engineer',
      office: 'London',
      extension: '2558',
      startDate: '2012/10/13',
      salary: '$132,000',
    },
    {
      id: 20,
      name: 'Dai Rios',
      position: 'Personnel Lead',
      office: 'Edinburgh',
      extension: '2290',
      startDate: '2012/09/26',
      salary: '$217,500',
    },
    {
      id: 21,
      name: 'Jenette Caldwell',
      position: 'Development Lead',
      office: 'New York',
      extension: '1937',
      startDate: '2011/09/03',
      salary: '$345,000',
    },
    {
      id: 22,
      name: 'Yuri Berry',
      position: 'Chief Marketing Officer (CMO)',
      office: 'New York',
      extension: '6154',
      startDate: '2009/06/25',
      salary: '$675,000',
    },
    {
      id: 23,
      name: 'Caesar Vance',
      position: 'Pre-Sales Support',
      office: 'New York',
      extension: '8330',
      startDate: '2011/12/12',
      salary: '$106,450',
    },
    {
      id: 24,
      name: 'Doris Wilder',
      position: 'Sales Assistant',
      office: 'Sidney',
      extension: '3023',
      startDate: '2010/09/20',
      salary: '$85,600',
    },
    {
      id: 25,
      name: 'Angelica Ramos',
      position: 'Chief Executive Officer (CEO)',
      office: 'London',
      extension: '5797',
      startDate: '2009/10/09',
      salary: '$1,200,000',
    },
    {
      id: 26,
      name: 'Gavin Joyce',
      position: 'Developer',
      office: 'Edinburgh',
      extension: '8822',
      startDate: '2010/12/22',
      salary: '$92,575',
    },
    {
      id: 27,
      name: 'Jennifer Chang',
      position: 'Regional Director',
      office: 'Singapore',
      extension: '9239',
      startDate: '2010/11/14',
      salary: '$357,650',
    },
    {
      id: 28,
      name: 'Brenden Wagner',
      position: 'Software Engineer',
      office: 'San Francisco',
      extension: '1314',
      startDate: '2011/06/07',
      salary: '$206,850',
    },
    {
      id: 29,
      name: 'Fiona Green',
      position: 'Chief Operating Officer (COO)',
      office: 'San Francisco',
      extension: '2947',
      startDate: '2010/03/11',
      salary: '$850,000',
    },
    {
      id: 30,
      name: 'Shou Itou',
      position: 'Regional Marketing',
      office: 'Tokyo',
      extension: '8899',
      startDate: '2011/08/14',
      salary: '$163,000',
    },
    {
      id: 31,
      name: 'Michelle House',
      position: 'Integration Specialist',
      office: 'Sidney',
      extension: '2769',
      startDate: '2011/06/02',
      salary: '$95,400',
    },
    {
      id: 32,
      name: 'Suki Burks',
      position: 'Developer',
      office: 'London',
      extension: '6832',
      startDate: '2009/10/22',
      salary: '$114,500',
    },
    {
      id: 33,
      name: 'Prescott Bartlett',
      position: 'Technical Author',
      office: 'London',
      extension: '3606',
      startDate: '2011/05/07',
      salary: '$145,000',
    },
    {
      id: 34,
      name: 'Gavin Cortez',
      position: 'Team Leader',
      office: 'San Francisco',
      extension: '2860',
      startDate: '2008/10/26',
      salary: '$235,500',
    },
    {
      id: 35,
      name: 'Martena Mccray',
      position: 'Post-Sales support',
      office: 'Edinburgh',
      extension: '8240',
      startDate: '2011/03/09',
      salary: '$324,050',
    },
    {
      id: 36,
      name: 'Unity Butler',
      position: 'Marketing Designer',
      office: 'San Francisco',
      extension: '5384',
      startDate: '2009/12/09',
      salary: '$85,675',
    },
  ];

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
    {
      data: null,
      title: 'Actions',
      name: 'Actions',
      render: function (data, type, row, meta) {
        return type === 'display'
          ? '<button type="button" class="delbutton btn btn-danger">Delete</button>'
          : '';
      },
      editable: false,
      orderable: false,
      searchable: false,
    },
  ];

  var myTable;

  myTable = $('#example').DataTable({
    pagingType: 'full_numbers',
    data: dataSet,
    columns: columnDefs,
    onAddRow: function (editor, values, success) {
      values['id'] =
        Math.max(
          0,
          ...editor
            .api()
            .rows()
            .data()
            .toArray()
            .map(function (row) {
              return Number(row['id']) || 0;
            })
        ) + 1;
      success();
    },
    layout: { topStart: 'buttons' },
    select: {
      style: 'single',
      toggleable: false,
    },
    responsive: true,
    altEditor: true, // Enable altEditor
    buttons: [],
  });

  $('#example tbody').on('click', 'tr', function (event) {
    if ($(this).hasClass('child')) return;
    if (
      myTable.responsive.hasHidden() &&
      $(event.target).closest('.dtr-control').length
    )
      return;
    myTable.altEditor().openEditDialog(this);
  });
  $('#example tbody').on('click', '.delbutton', function (event) {
    event.preventDefault();
    event.stopPropagation();
    var row = $(this).closest('tr');
    if (row.hasClass('child')) row = row.prev();
    myTable.altEditor().openDeleteDialog(row);
  });
  $('#addbutton').on('click', function () {
    myTable.altEditor().openAddDialog();
  });
});

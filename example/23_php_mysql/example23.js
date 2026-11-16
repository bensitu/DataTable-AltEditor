async function start() {
  const result = document.querySelector('#result');
  async function request(action, body) {
    const response = await fetch('api.php?action=' + action, {
      method: body === undefined ? 'GET' : 'POST',
      headers:
        body === undefined
          ? {}
          : {
              'Content-Type': 'application/json',
              'X-CSRF-Token': configuration.csrfToken,
            },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw data;
    return data;
  }
  let configuration;
  try {
    configuration = await request('bootstrap');
  } catch (_error) {
    result.textContent =
      'Start PHP and MySQL using the setup guide, then open this page on the PHP server. GitHub Pages cannot execute PHP.';
    return;
  }
  new DataTable('#example', {
    serverSide: true,
    processing: true,
    rowId: 'row_id',
    ajax: {
      url: 'api.php',
      timeout: 15000,
      error() {
        result.textContent =
          'The table could not load. Check the PHP server log and reload the page.';
      },
    },
    columns: [
      { data: 'name', title: 'Name', render: DataTable.render.text() },
      { data: 'email', title: 'Email', render: DataTable.render.text() },
      {
        data: 'department.name',
        title: 'Department',
        render: DataTable.render.text(),
      },
      {
        data: 'salary',
        title: 'Salary',
        render: DataTable.render.number(',', '.', 2, '$'),
      },
    ],
    pageLength: 10,
    lengthMenu: [10, 25, 50, 100],
    select: { style: 'multi' },
    layout: { topStart: 'buttons' },
    buttons: [
      { name: 'add', text: 'Add' },
      { name: 'edit', text: 'Edit', extend: 'selectedSingle' },
      { name: 'delete', text: 'Delete', extend: 'selected' },
      { name: 'refresh', text: 'Refresh' },
    ],
    altEditor: {
      fields: [
        { name: 'name', title: 'Name', required: true, maxLength: 120 },
        {
          name: 'email',
          title: 'Email',
          type: 'email',
          required: true,
          maxLength: 254,
        },
        {
          name: 'department',
          title: 'Department',
          type: 'select',
          options: configuration.departments,
          required: true,
          getValue: (value) => value?.id ?? configuration.departments[0]?.id,
          setValue: (id) => ({ id: Number(id) }),
        },
        {
          name: 'salary',
          title: 'Salary',
          type: 'number',
          min: 0,
          max: 99999999.99,
          step: 0.01,
          required: true,
          value: 0,
          setValue: Number,
        },
      ],
      onAddRow(_editor, values) {
        return request('create', values);
      },
      onEditRow(_editor, values, _success, _error, original) {
        return request('update', { ...values, id: original.id });
      },
      async onDeleteRow(_editor, rows) {
        await request('delete', { ids: rows.map((row) => row.id) });
      },
    },
  });
  result.textContent =
    'Connected to MySQL. Paging, sorting, and searching run on the server. Try an existing email address to see server validation.';
}
start();

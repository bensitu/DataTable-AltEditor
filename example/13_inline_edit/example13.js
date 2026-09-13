const people = new DataTable('#people', {
  data: [
    {
      id: 'alice',
      user: { name: 'Alice', email: 'alice@example.com' },
      age: 30,
      role: 'editor',
    },
    {
      id: 'bob',
      user: { name: 'Bob', email: 'bob@example.com' },
      age: 40,
      role: 'reader',
    },
    {
      id: 'carol',
      user: { name: 'Carol', email: 'carol@example.com' },
      age: 28,
      role: 'reader',
    },
    {
      id: 'dan',
      user: { name: 'Dan', email: 'dan@example.com' },
      age: 35,
      role: 'editor',
    },
    {
      id: 'eve',
      user: { name: 'Eve', email: 'eve@example.com' },
      age: 31,
      role: 'reader',
    },
    {
      id: 'frank',
      user: { name: 'Frank', email: 'frank@example.com' },
      age: 42,
      role: 'editor',
    },
  ],
  rowId: 'id',
  order: [],
  pageLength: 5,
  lengthMenu: [5, 10],
  columns: [
    { data: 'user.name', title: 'Name', required: true },
    {
      data: 'user.email',
      title: 'Email',
      type: 'email',
      required: true,
      unique: true,
      uniqueMsg: 'This email address is already in use.',
    },
    { data: 'age', title: 'Age', type: 'number', min: 0, max: 120, step: 1 },
    {
      data: 'role',
      title: 'Role',
      type: 'select',
      options: { editor: 'Editor', reader: 'Reader' },
    },
  ],
  altEditor: {
    inlineEdit: {
      enabled: true,
      selectText: true,
      tabNavigation: true,
      submitOnBlur: false,
    },
  },
  onInlineEditRow(editor, rowData, success, error, originalRowData, meta) {
    const fail = document.querySelector('#fail-next');
    const rejected = fail.checked;
    fail.checked = false;
    setTimeout(() => {
      if (rejected)
        error(
          new Error(
            'The save failed. Correct the value or press Enter to retry.'
          )
        );
      else success(rowData);
    }, 400);
  },
});

$(people.table().node()).on(
  'alteditor-inline-submit.dt alteditor-inline-success.dt alteditor-inline-error.dt alteditor-inline-cancel.dt',
  (event, detail) => {
    const messages = {
      'alteditor-inline-submit': 'Saving…',
      'alteditor-inline-success': 'Saved.',
      'alteditor-inline-error': detail.error
        ? String(detail.error.message || detail.error)
        : 'Unable to save.',
      'alteditor-inline-cancel': 'Edit canceled.',
    };
    document.querySelector('#status').textContent = messages[event.type];
  }
);

new DataTable('#cities', {
  data: [
    ['Tokyo', 10],
    ['Osaka', 20],
  ],
  columns: [
    { data: 0, title: 'City', required: true },
    { data: 1, title: 'Quantity', type: 'number', min: 0 },
  ],
  altEditor: { inlineEdit: true },
});

const tasks = new DataTable('#tasks', {
  data: [
    { name: 'Prepare report', status: 'Open', note: 'Review figures' },
    { name: 'Send invoice', status: 'Done', note: 'Sent by email' },
  ],
  columns: [
    { data: 'name', title: 'Task', required: true },
    {
      data: 'status',
      title: 'Status',
      inlineEditable: false,
      render(data, type) {
        if (type !== 'display') return data;
        const select = document.createElement('select');
        select.className = 'status-dropdown';
        select.setAttribute('aria-label', 'Task status');
        for (const value of ['Open', 'Done']) {
          select.add(new Option(value, value, false, value === data));
        }
        return select;
      },
    },
    { data: 'note', title: 'Note' },
  ],
  altEditor: { inlineEdit: true },
});

$('#tasks').on('change', '.status-dropdown', function () {
  // Update the data source so sorting, filtering, and redraws use the new value.
  tasks.cell(this.closest('td')).data(this.value).draw(false);
});

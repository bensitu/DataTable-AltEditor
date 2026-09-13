async function start() {
  const result = document.querySelector('#result');
  let rows;
  try {
    const response = await fetch('/api/records');
    if (!response.ok) throw new Error('Local server required');
    rows = await response.json();
  } catch (_error) {
    result.textContent =
      'Start server.mjs and open the local page linked above. This example needs its Node.js server.';
    return;
  }

  async function save(method, url, values, success, error) {
    const body = new FormData();
    body.append('name', values.name);
    if (values.attachment instanceof File)
      body.append('attachment', values.attachment);
    try {
      const response = await fetch(url, { method, body });
      const row = await response.json();
      if (!response.ok) throw new Error(row.message);
      success(row);
      result.textContent =
        'Saved by the server. Reload this page to verify persistence.';
    } catch (failure) {
      error(failure);
    }
  }

  new DataTable('#example', {
    data: rows,
    rowId: 'id',
    columns: [
      { data: 'id', title: 'ID', readonly: true },
      {
        data: 'name',
        title: 'Name',
        required: true,
        render: DataTable.render.text(),
      },
      {
        data: 'attachment',
        title: 'Attachment',
        type: 'file',
        maxFileSize: 2 * 1024 * 1024,
        render(data, type) {
          if (type !== 'display') return data ? data.name : '';
          if (!data) return 'No attachment';
          const link = document.createElement('a');
          link.href = '/api/files/' + data.id;
          link.textContent = data.name;
          link.download = data.name;
          return link;
        },
      },
    ],
    select: 'single',
    layout: { topStart: 'buttons' },
    buttons: [
      { name: 'add', text: 'Add' },
      { name: 'edit', text: 'Edit', extend: 'selectedSingle' },
      { name: 'delete', text: 'Delete', extend: 'selected' },
    ],
    altEditor: { encodeFiles: false },
    onAddRow(editor, values, success, error) {
      save('POST', '/api/records', values, success, error);
    },
    onEditRow(editor, values, success, error, original) {
      save('PATCH', '/api/records/' + original.id, values, success, error);
    },
    async onDeleteRow(editor, values, success, error) {
      try {
        const response = await fetch('/api/records/' + values[0].id, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error((await response.json()).message);
        success();
      } catch (failure) {
        error(failure);
      }
    },
  });
  result.textContent =
    'Connected. Names must be unique on the server; try a duplicate to see a rejected save.';
}
start();

let nextId = 3;
const table = new DataTable('#example', {
  data: [
    { id: '1', name: 'Alice', email: 'alice@example.com', team: 'Design' },
    { id: '2', name: 'Bob', email: 'bob@example.com', team: 'Engineering' },
  ],
  rowId: 'id',
  columns: [
    { data: 'id', title: 'ID', type: 'hidden' },
    {
      data: 'name',
      title: 'Name',
      required: true,
      render: DataTable.render.text(),
    },
    {
      data: 'email',
      title: 'Email',
      type: 'email',
      required: true,
      render: DataTable.render.text(),
    },
    {
      data: 'team',
      title: 'Team',
      type: 'select',
      options: ['Design', 'Engineering'],
      value: 'Design',
      render: DataTable.render.text(),
    },
  ],
  select: 'multi',
  layout: { topStart: 'buttons' },
  buttons: [
    { name: 'add', text: 'Add' },
    { name: 'edit', text: 'Edit', extend: 'selectedSingle' },
    { name: 'delete', text: 'Delete', extend: 'selected' },
  ],
  altEditor: {
    dialog: {
      framework: 'bootstrap',
      templates: { add: '#create-person', edit: '#edit-person' },
      deleteDetails({ rows }) {
        if (!document.querySelector('#show-details').checked) return false;
        const list = document.createElement('ul');
        rows.forEach((row) => {
          const item = document.createElement('li');
          item.textContent = row.name + ' — ' + row.email;
          list.appendChild(item);
        });
        return list;
      },
      onRender({ action, rows, form }) {
        if (action === 'edit') {
          form.querySelector('[data-person-summary]').textContent =
            'Editing ' + rows[0].name;
        }
        document.querySelector('#result').textContent = 'Opened: ' + action;
      },
      onClose({ action }) {
        document.querySelector('#result').textContent = 'Closed: ' + action;
      },
    },
  },
  onAddRow(editor, values, success) {
    success({ ...values, id: String(nextId++) });
  },
});

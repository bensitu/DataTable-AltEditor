const roles = [
  { id: 1, label: 'Reader' },
  { id: 2, label: 'Writer' },
  { id: 3, label: 'Administrator' },
];

new DataTable('#example', {
  data: [
    {
      id: 'alice',
      name: 'Alice',
      email: 'alice@example.com',
      roles: [roles[0]],
      active: true,
    },
    {
      id: 'bob',
      name: 'Bob',
      email: 'bob@example.com',
      roles: [roles[0], roles[1]],
      active: false,
    },
  ],
  rowId: 'id',
  columns: [
    { data: 'name', title: 'Name', render: DataTable.render.text() },
    {
      data: 'roles',
      title: 'Roles',
      render(roles, type) {
        const labels = roles.map((role) => role.label).join(', ');
        return type === 'display' ? DataTable.render.text().display(labels) : labels;
      },
    },
    {
      data: 'active',
      title: 'Active',
      render: (value) => (value ? 'Yes' : 'No'),
    },
  ],
  select: 'single',
  layout: { topStart: 'buttons' },
  buttons: [
    { name: 'add', text: 'Add' },
    { name: 'edit', text: 'Edit', extend: 'selectedSingle' },
    { name: 'delete', text: 'Delete', extend: 'selected' },
  ],
  altEditor: {
    fields: [
      { name: 'name', title: 'Full name', required: true },
      { name: 'email', title: 'Email', type: 'email', required: true },
      {
        name: 'roles',
        title: 'Permissions',
        type: 'select',
        multiple: true,
        options: roles,
        value: [roles[0]],
        required: true,
        getValue: (value) => value.map((role) => role.id),
        setValue: (ids) =>
          ids.map((id) => roles.find((role) => String(role.id) === id)),
      },
      { name: 'active', title: 'Active', type: 'checkbox', value: true },
    ],
    onAddRow(_editor, values, success) {
      success({ ...values, id: crypto.randomUUID() });
    },
  },
});

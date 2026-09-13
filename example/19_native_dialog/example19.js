let nextId = 3;
const skills = {
  design: 'Design',
  javascript: 'JavaScript',
  support: 'Support',
};
const table = new DataTable('#example', {
  data: [
    {
      id: '1',
      name: 'Alice',
      email: 'alice@example.com',
      budget: 1250.5,
      startDate: '2026-09-14',
      active: true,
      skills: ['design'],
      notes: 'Available in the morning.',
    },
    {
      id: '2',
      name: 'Bob',
      email: 'bob@example.com',
      budget: 800,
      startDate: '2026-10-01',
      active: false,
      skills: ['javascript', 'support'],
      notes: '',
    },
  ],
  rowId: 'id',
  columns: [
    { data: 'id', title: 'ID', type: 'hidden' },
    {
      data: 'name',
      title: 'Name',
      required: true,
      render(value, type) {
        if (type !== 'display') return value;
        const name = document.createElement('strong');
        name.textContent = value;
        return name;
      },
    },
    {
      data: 'email',
      title: 'Email',
      type: 'email',
      required: true,
      render: DataTable.render.text(),
    },
    {
      data: 'budget',
      title: 'Budget',
      type: 'number',
      min: 0,
      step: 0.01,
      required: true,
      value: 0,
      render: DataTable.render.number(',', '.', 2, '$'),
    },
    {
      data: 'startDate',
      title: 'Start date',
      type: 'date',
      required: true,
      value: '2026-09-14',
    },
    {
      data: 'active',
      title: 'Active',
      type: 'checkbox',
      value: true,
      render(value, type) {
        if (type !== 'display') return value ? 1 : 0;
        const badge = document.createElement('span');
        badge.className = 'person-status';
        badge.textContent = value ? 'Active' : 'Inactive';
        return badge;
      },
    },
    {
      data: 'skills',
      title: 'Skills',
      type: 'select',
      multiple: true,
      select2: { width: '100%' },
      options: skills,
      value: ['design'],
      render: (values) => values.map((value) => skills[value]).join(', '),
    },
    {
      data: 'notes',
      title: 'Notes',
      type: 'textarea',
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
      framework: 'native',
      templates: { add: '#person-fields', edit: '#person-fields' },
      deleteDetails: ({ rows }) => rows.map((row) => row.name).join(', '),
    },
  },
  onAddRow(editor, values, success) {
    success({ ...values, id: String(nextId++), budget: Number(values.budget) });
  },
  onEditRow(editor, values, success) {
    success({ ...values, budget: Number(values.budget) });
  },
});
const supported =
  typeof document.createElement('dialog').showModal === 'function';
document.querySelector('#result').textContent = supported
  ? 'Select2 opens inside the native dialog. Saved numbers, dates, booleans, and arrays remain available when reopening.'
  : 'This browser does not support native dialogs. Use the Bootstrap or Foundation examples.';
if (!supported) table.buttons().disable();

const tasks = new DataTable('#tasks', {
  data: [
    {
      name: 'Prepare report',
      status: 'Open',
      quantity: 2,
      complete: false,
      note: 'Review figures',
    },
    {
      name: 'Send invoice',
      status: 'Done',
      quantity: 1,
      complete: true,
      note: 'Sent by email',
    },
  ],
  columns: [
    {
      data: 'name',
      title: 'Task',
      required: true,
      render(data, type) {
        if (type !== 'display') return data;
        const text = document.createElement('strong');
        text.textContent = data;
        return text;
      },
    },
    {
      data: 'status',
      title: 'Status',
      render(data, type) {
        if (type !== 'display') return data;
        const select = document.createElement('select');
        select.className = 'status-dropdown';
        select.setAttribute('aria-label', 'Task status');
        for (const value of ['Open', 'Done'])
          select.add(new Option(value, value, false, value === data));
        return select;
      },
    },
    {
      data: 'quantity',
      title: 'Quantity',
      render(data, type) {
        if (type !== 'display') return data;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.step = 1;
        input.required = true;
        input.value = data;
        input.setAttribute('aria-label', 'Quantity');
        return input;
      },
    },
    {
      data: 'complete',
      title: 'Complete',
      render(data, type) {
        if (type !== 'display') return data;
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = data;
        input.setAttribute('aria-label', 'Complete');
        return input;
      },
    },
    {
      data: 'note',
      title: 'Note',
      render(data, type) {
        if (type !== 'display') return data;
        const input = document.createElement('textarea');
        input.value = data;
        input.rows = 2;
        input.setAttribute('aria-label', 'Task note');
        return input;
      },
    },
  ],
  altEditor: { inlineEdit: true },
});

$('#tasks').on('change', 'input, select, textarea', function () {
  if (this.classList.contains('alteditor-inline-control')) return;
  if (!this.reportValidity()) return;
  const value =
    this.type === 'checkbox'
      ? this.checked
      : this.type === 'number'
        ? this.valueAsNumber
        : this.value;
  tasks.cell(this.closest('td')).data(value).draw(false);
});

const actions = new DataTable('#actions', {
  data: [{ name: 'Prepare report', note: 'Review figures', enabled: true }],
  columns: [
    { data: 'name', title: 'Task', required: true },
    {
      data: 'note',
      title: 'Editable note',
      render(data, type) {
        if (type !== 'display') return data;
        const note = document.createElement('span');
        note.contentEditable = 'true';
        note.setAttribute('aria-label', 'Editable note');
        note.textContent = data;
        return note;
      },
    },
    {
      data: 'name',
      title: 'Action',
      render(data, type) {
        if (type !== 'display') return data;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'show-task';
        button.textContent = 'Show task';
        return button;
      },
    },
    {
      data: 'name',
      title: 'Link',
      render(data, type) {
        if (type !== 'display') return data;
        const link = document.createElement('a');
        link.href = '#result';
        link.textContent = 'View result';
        return link;
      },
    },
    {
      data: 'note',
      title: 'Details',
      render(data, type) {
        if (type !== 'display') return data;
        const details = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Expand';
        details.append(summary, data);
        return details;
      },
    },
    {
      data: 'enabled',
      title: 'Custom switch',
      inlineEditable: false,
      render(data, type) {
        if (type !== 'display') return data;
        const control = document.createElement('span');
        control.className = 'task-switch';
        control.tabIndex = 0;
        control.setAttribute('role', 'switch');
        control.setAttribute('aria-label', 'Task enabled');
        control.setAttribute('aria-checked', String(data));
        control.textContent = data ? 'On' : 'Off';
        return control;
      },
    },
  ],
  altEditor: { inlineEdit: true },
});

$('#actions').on('focusout', '[contenteditable="true"]', function () {
  const row = actions.row(this.closest('tr'));
  if (row.data().note !== this.textContent)
    row.data({ ...row.data(), note: this.textContent }).draw(false);
});
$('#actions').on('click', '.show-task', function () {
  const row = actions.row(this.closest('tr')).data();
  document.querySelector('#result').textContent = 'Selected task: ' + row.name;
});
$('#actions').on('click keydown', '.task-switch', function (event) {
  if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  const cell = actions.cell(this.closest('td'));
  cell.data(!cell.data()).draw(false);
  cell.node().querySelector('.task-switch').focus();
});

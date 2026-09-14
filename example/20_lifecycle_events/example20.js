let nextId = 3;
let removeFormListener;
const log = document.querySelector('#event-log');
const result = document.querySelector('#result');

function record(message) {
  const item = document.createElement('li');
  item.textContent = message;
  log.appendChild(item);
  if (log.children.length > 40) log.firstElementChild.remove();
  result.textContent = message;
}

// Events run before their corresponding dialog callbacks.
const eventNames = [
  'before-open',
  'dialog-render',
  'open',
  'pre-submit',
  'submit',
  'success',
  'error',
  'close',
  'destroy',
  'inline-open',
  'inline-pre-submit',
  'inline-submit',
  'inline-success',
  'inline-error',
  'inline-cancel',
  'inline-close',
];
eventNames.forEach((name) => {
  $('#example').on('alteditor-' + name + '.dt.example', (event, detail) => {
    if (name === 'destroy' && removeFormListener) {
      removeFormListener();
      removeFormListener = undefined;
    }
    record(
      name +
        (detail.action ? ': ' + detail.action : '') +
        (detail.reason ? ' (' + detail.reason + ')' : '') +
        (detail.error ? ' — ' + detail.error.message : '')
    );
    const values = detail.values || detail.rowData;
    if (
      (name === 'pre-submit' || name === 'inline-pre-submit') &&
      values &&
      values.name === 'blocked'
    ) {
      event.preventDefault();
      record('Submission canceled: choose a name other than blocked.');
    }
  });
});

const editorOptions = {
  inlineEdit: true,
  dialog: {
    framework: 'bootstrap',
    deleteDetails: ({ rows }) => rows.map((row) => row.name).join(', '),
    onBeforeOpen({ action }) {
      record('onBeforeOpen: ' + action);
      if (document.querySelector('#block-opening').checked) {
        record('Opening canceled by onBeforeOpen.');
        return false;
      }
    },
    onRender({ action, form }) {
      record('onRender: ' + action);
      const name = form.querySelector('[name="name"]');
      if (!name) return;
      const hint = document.createElement('p');
      hint.setAttribute('role', 'status');
      form.prepend(hint);
      const updateHint = () => {
        hint.textContent =
          name.value === 'blocked'
            ? 'Choose another name before saving.'
            : 'Ready to save this name.';
      };
      name.addEventListener('input', updateHint);
      removeFormListener = () => name.removeEventListener('input', updateHint);
      updateHint();
    },
    onClose({ action }) {
      if (removeFormListener) removeFormListener();
      removeFormListener = undefined;
      record('onClose: ' + action);
    },
  },
};

// A short delay represents a request. Set a timeout in a real network transport.
function save(editor, values, success, error) {
  const fail = document.querySelector('#fail-next').checked;
  document.querySelector('#fail-next').checked = false;
  setTimeout(() => {
    if (fail) error(new Error('The save failed. Try again.'));
    else success();
  }, 400);
}

const table = new DataTable('#example', {
  data: [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
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
  ],
  select: 'multi',
  layout: { topStart: 'buttons' },
  buttons: [
    { name: 'add', text: 'Add' },
    { name: 'edit', text: 'Edit', extend: 'selectedSingle' },
    { name: 'delete', text: 'Delete', extend: 'selected' },
    { name: 'refresh', text: 'Refresh' },
  ],
  altEditor: editorOptions,
  onAddRow(editor, values, success, error) {
    save(
      editor,
      values,
      () => success({ ...values, id: String(nextId++) }),
      error
    );
  },
  onEditRow: save,
  onDeleteRow: save,
});

document.querySelector('#clear-events').addEventListener('click', () => {
  log.replaceChildren();
  result.textContent = 'Event log cleared.';
});
document.querySelector('#toggle-editor').addEventListener('click', (event) => {
  const editor = table.altEditor();
  if (editor) {
    editor.destroy();
    event.currentTarget.textContent = 'Enable editor';
  } else {
    table.altEditor(editorOptions);
    event.currentTarget.textContent = 'Destroy editor';
    record('Editor enabled.');
  }
});

let nextId = 3;
const delay = () => new Promise((resolve) => setTimeout(resolve, 400));

// These functions simulate a server. Replace them with requests to your API.
async function saveContact(editor, values, success, error, originalRowData) {
  await delay();
  if (values.email === 'reserved@example.com') {
    throw {
      message: 'The contact could not be saved.',
      fieldErrors: { email: 'This email address is reserved.' },
    };
  }
  if (values.email === 'offline@example.com') {
    throw new Error('The service is unavailable. Correct the email and retry.');
  }
  return {
    ...originalRowData,
    ...values,
    id: originalRowData ? originalRowData.id : nextId++,
  };
}

const table = new DataTable('#example', {
  data: [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
  ],
  rowId: 'id',
  columns: [
    { data: 'id', title: 'ID', type: 'readonly' },
    {
      data: 'name',
      title: 'Name',
      required: true,
      editorValidate(value) {
        if (value.trim().length < 2) return 'Enter at least two characters.';
      },
    },
    {
      data: 'email',
      title: 'Email',
      type: 'email',
      required: true,
      async editorValidate(value) {
        await delay();
        if (value === 'taken@example.com')
          return 'This email address is already in use.';
      },
    },
  ],
  select: 'single',
  layout: {
    topStart: {
      buttons: [
        { name: 'add', text: 'Add' },
        { name: 'edit', text: 'Edit' },
        { name: 'delete', text: 'Delete' },
      ],
    },
  },
  altEditor: {
    inlineEdit: true,
    onAddRow: saveContact,
    onEditRow: saveContact,
    onInlineEditRow: saveContact,
    async onDeleteRow() {
      await delay();
    },
  },
});

table.on('alteditor-success.dt alteditor-inline-success.dt', () => {
  document.querySelector('#result').textContent =
    'Saved locally. Reloading resets the contacts.';
});

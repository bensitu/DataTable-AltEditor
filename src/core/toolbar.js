const editorActions = {
  add: 'openAddDialog',
  edit: 'openEditDialog',
  delete: 'openDeleteDialog',
  refresh: 'refresh',
};

export function bindToolbar(editor) {
  const api = editor.api();
  if (typeof api.button !== 'function') return;
  Object.keys(editorActions).forEach((name) => {
    const button = api.button(name + ':name');
    if (!button || !button.count()) return;
    const original = button.action();
    const action = () => {
      editor[editorActions[name]]();
    };
    editor._buttonActions.push({ name, original, action });
    button.action(action);
  });
}

export function restoreToolbar(editor) {
  const api = editor.api();
  editor._buttonActions.forEach(({ name, original, action }) => {
    const button = api.button(name + ':name');
    if (button.count() && button.action() === action)
      button.action(original || function () {});
  });
  editor._buttonActions = [];
}

export function selectionListener() {
  const api = this.api();
  const namespace = this.s.namespace;
  const updateEditButton = () => {
    if (typeof api.buttons !== 'function') return;
    const buttons = api.buttons('edit:name');
    if (!buttons || (typeof buttons.count === 'function' && !buttons.count()))
      return;
    if (this._selectedRows().count() === 1) buttons.enable();
    else buttons.disable();
  };
  const events = 'select' + namespace + ' deselect' + namespace;
  api.off(events);
  api.on(events, updateEditButton);
  updateEditButton();
}

/** Translate framework notifications into editor lifecycle operations. */
export function bindDialogEvents(editor, $modal) {
  const useNative = $modal.is('dialog');
  $modal.on(
    'shown.bs.modal' +
      editor.s.namespace +
      ' open.zf.reveal' +
      editor.s.namespace,
    function () {
      editor._focusFirstInput();
    }
  );
  $modal.on('submit' + editor.s.namespace, 'form', function (event) {
    event.preventDefault();
  });
  if (useNative) {
    $modal.on(
      'close' +
        editor.s.namespace +
        ' alteditor-native-closed' +
        editor.s.namespace,
      function () {
        if (!this.open) editor._handleDialogClosed();
      }
    );
    $modal.on('cancel' + editor.s.namespace, function (event) {
      event.preventDefault();
    });
    $modal.on(
      'click' + editor.s.namespace,
      '.altEditor-close, [data-alteditor-close]',
      function () {
        if (!editor._submitting)
          editor.internalCloseDialog(editor.modal_selector);
      }
    );
  }
  $modal.on('hidden.bs.modal' + editor.s.namespace, () =>
    editor._handleDialogClosed()
  );
  $modal.on('hide.bs.modal' + editor.s.namespace, function (event) {
    if (editor._submitting && !editor._destroyed) event.preventDefault();
    else editor._closing = true;
  });
  $modal.on('closed.zf.reveal' + editor.s.namespace, function () {
    editor._handleDialogClosed();
  });
}

# Editor events

[Documentation](README.md) · [Project overview](../README.md)

[Example 20](../example/20_lifecycle_events/example20.html) demonstrates the callbacks and event sequence with cancellation, failed saves, retries, inline editing, refresh, and destruction.

AltEditor uses jQuery events on the DataTables table node. New event names have the `.dt` namespace, `event.dt` contains the table API, and the second handler argument is a payload containing `editor`.

```js
$(table.table().node()).on('alteditor-inline-success.dt', (event, detail) => {
  console.log(detail.rowIndex, detail.columnIndex, detail.newValue);
});
```

## Dialog and table lifecycle

| Event                     | Meaning                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `alteditor-open.dt`       | A row dialog is ready.                                                                      |
| `alteditor-pre-submit.dt` | Validated values are ready; preventDefault() cancels submission. Also emitted by refresh(). |
| `alteditor-submit.dt`     | Persistence or refresh starts.                                                              |
| `alteditor-success.dt`    | The accepted result has been applied.                                                       |
| `alteditor-error.dt`      | Validation, persistence, or target resolution failed.                                       |
| `alteditor-close.dt`      | The dialog framework reports closure.                                                       |
| `alteditor-destroy.dt`    | Editor resources have been released.                                                        |

Dialog payloads use `action` (add, edit, delete, or refresh) and `mode: 'dialog'`. Submission events include `values`; edit operations include the original `row`, and deletion includes `rows`. Error events include `error`. The destruction payload contains the editor. Refresh emits pre-submit, submit, and success; Ajax transport errors continue to use DataTables' Ajax error handling.

`alteditor-error.dt` also reports unavailable dialog frameworks with `action: 'open'` and `mode: 'dialog'`, and translation loading or validation failures with `action: 'language'`. Missing frameworks prevent the dialog from opening and display a message. Translation failures keep the existing labels and produce a console warning. Invalid automatic editor configuration is logged before an editor is attached, so it does not emit an editor event.

If a submission event handler destroys the editor, its persistence callback is not invoked afterward. Refresh completion is ignored after destruction. A dialog opened by a success handler is independent of the completed dialog and remains open.

## Dialog customization

`alteditor-before-open.dt` runs after selection validation and can be canceled with `preventDefault()`. `alteditor-dialog-render.dt` runs once generated fields, populated values, plugins, and form submission are ready. The render payload additionally contains the DOM `dialog` and `form`.

These events and `alteditor-close.dt` have corresponding synchronous `dialog.onBeforeOpen`, `dialog.onRender`, and `dialog.onClose` callbacks. Their context includes `action`, `mode`, and detached `rows` (empty for add). Before-open receives the original selection; render receives current values from the same record identities after the opening callbacks. If a selected record disappears, opening fails. Callbacks follow their corresponding event. `alteditor-open.dt` follows render notification. See [dialog configuration](dialogs.md#lifecycle-callbacks) for cancellation, cleanup, and template examples.

Opening configuration failures use `alteditor-error.dt` with `action: 'open'`; this includes invalid templates, unavailable explicitly selected frameworks, and unsupported native dialogs. Wait for the close event before opening another dialog during a framework closing transition.

## Inline lifecycle

| Event                            | Meaning                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `alteditor-inline-open.dt`       | A native control is active.                                      |
| `alteditor-inline-pre-submit.dt` | The candidate row is ready; preventDefault() leaves it editable. |
| `alteditor-inline-submit.dt`     | Persistence starts.                                              |
| `alteditor-inline-success.dt`    | The accepted row has been applied.                               |
| `alteditor-inline-error.dt`      | Validation, persistence, or target resolution failed.            |
| `alteditor-inline-cancel.dt`     | An unsaved edit was canceled.                                    |
| `alteditor-inline-close.dt`      | The active control was released.                                 |

Payload fields include `rowIndex`, `columnIndex`, `dataSrc`, `oldValue`, and `cellNode`. Submission adds `newValue` and the candidate `rowData`. Error events add `error`; cancellation and closure add `reason`.

Closing reasons include `success`, `cancel`, `escape`, `blur`, `draw`, `replace`, `dialog`, `destroy`, `target-unavailable`, and `error`. Cancellation emits cancel followed by close. Successful persistence emits success followed by close, before starting a Tab navigation target. Destruction closes a pending edit without applying late results.

```js
$(table.table().node()).on(
  'alteditor-inline-pre-submit.dt',
  (event, detail) => {
    if (detail.newValue === 'reserved') event.preventDefault();
  }
);
```

Canceling pre-submit does not call persistence and does not discard the user's value. Exceptions in before-open or pre-submit event handlers cancel that operation. Other event handler exceptions are logged without interrupting editor cleanup or reverting an accepted update. Handle application errors inside each listener when later listeners must also run. Event handlers should be synchronous; asynchronous persistence belongs in the CRUD callbacks. There is no separate native event channel.

## Modal compatibility events

These existing events still originate on the dialog element and bubble through jQuery:

- `alteditor:some_dialog_opened`
- `alteditor:add_dialog_opened`
- `alteditor:edit_dialog_opened`
- `alteditor:delete_dialog_opened`

They retain their existing names and argument behavior. Use the table lifecycle events for structured payloads and table-specific subscriptions.

An explicit open call may replace an idle dialog, including one retained after success. Replacement does not emit a framework close event. Release application listeners before replacing such a dialog, or close it and wait for `alteditor-close.dt` when each form needs a matching close callback. Recursive opening, pending submissions, and closing transitions reject replacement.

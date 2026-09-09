# Editor events

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

Canceling pre-submit does not call persistence and does not discard the user's value. Event handlers should be synchronous; asynchronous persistence belongs in the CRUD callbacks. There is no separate native event channel.

## Modal compatibility events

These existing events still originate on the dialog element and bubble through jQuery:

- `alteditor:some_dialog_opened`
- `alteditor:add_dialog_opened`
- `alteditor:edit_dialog_opened`
- `alteditor:delete_dialog_opened`

They retain their existing names and argument behavior. Use the table lifecycle events for structured payloads and table-specific subscriptions.

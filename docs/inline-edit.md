# Inline editing

Enable editing with `altEditor: { inlineEdit: true }` or configure:

```js
altEditor: {
  inlineEdit: {
    enabled: true,
    submitOnBlur: false,
    selectText: true,
    tabNavigation: true,
  },
}
```

Inline editing is disabled by default. An enabled table uses one delegated double-click listener and permits one active cell. Different tables remain independent. Use `editor.startInlineEdit({ row: 0, column: 1 })` for programmatic activation. It returns false for an unavailable or unsupported cell, or while persistence or a row dialog is active.

## Controls

Supported controls are text, number, email, date, time, datetime-local, textarea, select, and checkbox. Optional dialog plugins are not applied to inline controls. Native constraints such as required, pattern, min, max, step, and maxLength apply where supported by the control. Number inputs return numbers or an empty string; checkboxes return booleans; other inputs return strings, and multiple selects return arrays of strings.

`inlineEditable` defaults to `editable`. `inlineEditType` overrides the control type, and `inlineEditOptions` overrides field attributes such as options and min. Readonly, disabled, hidden, file, and action columns are excluded. `columns[].inline` continues to control dialog layout and does not enable cell editing.

The raw value comes from `cell.data()`, independently of formatted cell HTML. Successful updates use DataTables rendering. Numeric sources, including array index 0, and dotted paths such as `user.email` are supported. Unsafe prototype paths are rejected.

For function or complex object sources, provide a setter:

```js
{
  data: row => row.user.email,
  title: 'Email',
  inlineEditType: 'email',
  inlineEditSetValue(rowData, value, meta) {
    rowData.user.email = value;
    return rowData;
  },
}
```

The setter receives a copy of the row's array and plain-object branches and must return a usable row object or array. Do not mutate opaque object values such as File objects. Without a setter, function and complex sources are not editable. Unsupported cells do not open a dialog automatically.

## Keyboard and focus

| Input           | Result                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| Enter           | Validate and save. Ignored while IME composition is active.                                            |
| Escape          | Cancel an unsaved value and return focus to the cell.                                                  |
| Tab / Shift+Tab | Save, then move to the next or previous eligible visible cell in the same row. No movement on failure. |
| Blur            | Cancel by default; save once when submitOnBlur is true.                                                |

`selectText` selects text when the control supports it. `tabNavigation: false` leaves Tab to normal browser focus navigation and the configured blur behavior. Enter submits textarea values too. Pending persistence disables the control; Escape and `cancelInlineEdit()` cannot revoke a submitted operation.

## Persistence

```js
onInlineEditRow(editor, rowData, success, error, originalRowData, meta);
```

The callback falls back to `onEditRow`. Without either callback, the row updates locally. The candidate is not written into DataTables before success. Call `success()` to accept it, `success(persistedRow)` to supply a server result, or `error(errorValue)` to permit correction and retry. Only the first settlement is accepted. `commitInlineEdit()` returns whether submission began; subscribe to events for its outcome.

`meta` includes rowIndex, columnIndex, dataSrc, oldValue, newValue, rowData, and cellNode. `originalRowData` is a snapshot. Row identity is captured independently of table selection. A stable DataTables rowId is recommended for asynchronous persistence.

Validation and callback failures keep the value available for retry while the target remains available. If a pending operation's cell is detached by a draw, persistence continues independently; failures reattach the control when its target is visible. If the row can no longer be identified, an error is emitted and the edit closes.

Sorting, paging, or another redraw cancels an unsaved edit synchronously. A redraw during submission is allowed to continue. A successful response resolves the saved target again and redraws without resetting the page. Sorting and filtering can move the changed row out of view, in which case keyboard navigation ends. Results arriving after editor destruction are ignored.

With server-side processing, only loaded rows participate in client validation, and the server's next draw is authoritative. Validate on the server and reload data when appropriate.

See [events](events.md) and the [working example](../example/13_inline_edit/example13.html).

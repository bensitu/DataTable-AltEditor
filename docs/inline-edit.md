# Inline editing

[Documentation](README.md) · [Project overview](../README.md)

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

## Rendered interactive controls

A column can display its own dropdown through `columns.render` while other columns use AltEditor inline editing. AltEditor skips cells containing native inputs, selects, textareas, buttons, links, editable content, details summaries, media playback controls, or elements with tabindex. It also recognizes the ARIA button, checkbox, combobox, link, radio, slider, spinbutton, switch, and textbox roles. Double-clicks, Tab navigation, and `startInlineEdit()` do not replace those controls. Ordinary text and noninteractive markup remain editable. Tab navigation continues to the next eligible cell; the browser's normal focus navigation can reach the rendered controls.

Set `inlineEditable: false` on a column owned by a custom control to make that intent explicit, including when the control is not currently rendered. This does not disable the field in row dialogs. Custom widgets with only application-defined mouse handlers cannot be detected reliably; set this option for those columns. The editor does not infer interactivity from styling, images, icons, or CSS class names.

Rendering a dropdown does not update the DataTables data source when its selection changes. Use a delegated change handler so it continues working after sorting, paging, and redraws:

```js
$('#example').on('change', '.status-dropdown', function () {
  table.cell(this.closest('td')).data(this.value).draw(false);
});
```

If a delegated handler matches inputs or textareas broadly, exclude `.alteditor-inline-control` so it does not also process AltEditor-owned input. See Example 14 for the check.

Here, `table` is the DataTables API instance returned by initialization. Resolve the cell from the current DOM node instead of keeping a row index in the rendered HTML. This example assumes the dropdown is in a normal table cell; controls copied into Responsive child rows need their original cell resolved separately.

The change handler above saves only to the local table. Custom controls do not automatically invoke `onInlineEditRow`, AltEditor validation, or inline lifecycle events. For remote persistence, handle the request and errors in the change handler and update table data after the server accepts the value. Avoid allowing overlapping writes to the same row while a save is pending.

Return the raw value for non-display rendering so sorting and searching use the stored status. DataTables 2 permits a DOM node for display rendering; creating a select with `new Option()` avoids interpolating option values into HTML. See [Example 14](../example/14_rendered_controls/example14.js) for a complete configuration and [DataTables rendering](https://datatables.net/reference/option/columns.render) for the rendering contract.

## Controls

Supported controls are text, number, email, date, time, datetime-local, textarea, select, and checkbox. Optional dialog plugins are not applied to inline controls. Native constraints such as required, pattern, min, max, step, and maxLength apply where supported by the control. Number inputs return numbers or an empty string; checkboxes return booleans; other inputs return strings, and multiple selects return arrays of strings.

`inlineEditable` defaults to `editable`. `inlineEditType` overrides the control type, and `inlineEditOptions` overrides field attributes such as options and min. Readonly, disabled, hidden, file, and action columns are excluded. `columns[].inline` continues to control dialog layout and does not enable cell editing.

The raw value comes from `cell.data()`, independently of formatted cell HTML. Successful updates use DataTables rendering. Numeric sources, including array index 0, and dotted paths such as `user.email` are supported. Unsafe prototype paths are rejected.

Native date, time, and datetime-local controls require values in their HTML formats, such as `2026-09-11`, `14:30`, and `2026-09-11T14:30`. Inline editing does not apply dialog `dateFormat` or Moment conversion. Keep raw values in native-compatible formats and use DataTables renderers for localized display.

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

Configure `rowId` when Ajax reloads can replace row objects while saving. Without a stable identifier, the editor rejects results for replaced objects because it cannot reliably associate them with the original row.

Validation and callback failures keep the value available for retry while the target remains available. If a pending operation's cell is detached by a draw, persistence continues independently; failures reattach the control when its target is visible. If the row can no longer be identified, an error is emitted and the edit closes.

Sorting, paging, or another redraw cancels an unsaved edit synchronously. A redraw during submission is allowed to continue. A successful response resolves the saved target again and redraws without resetting the page. Sorting and filtering can move the changed row out of view, in which case keyboard navigation ends. Results arriving after editor destruction are ignored.

With server-side processing, only loaded rows participate in client validation, and the server's next draw is authoritative. Validate on the server and reload data when appropriate.

See [events](events.md) and the [working example](../example/13_inline_edit/example13.html).

[Example 17](../example/17_inline_options/example17.html) combines explicit setters, formatted numeric values, control overrides, blur saving, and public edit methods. Use Enter or Escape while a cell is focused; moving keyboard focus away saves when blur saving is enabled.

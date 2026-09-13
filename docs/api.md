# Configuration and API

[Documentation](README.md) · [Project overview](../README.md)

Use `altEditor: true` for row dialogs or an options object to customize behavior. `table.altEditor()` returns the existing editor or `null`; `table.altEditor(options)` creates one when absent. `DataTable.altEditor` exposes the constructor. The [quick start](../README.md#get-started) shows initialization and dependencies.

## Configuration

Configuration precedence is: AltEditor defaults, `DataTable.defaults.altEditor`, root-level compatibility options, then the instance `altEditor` object. Explicit constructor options are applied last. Functions retain their references, arrays are copied and replaced, and unsafe object keys are rejected.

| Option                | Default  | Behavior                                                                                                       |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `closeModalOnSuccess` | `true`   | Close a successful dialog. When false, show success and disable further submission until another dialog opens. |
| `encodeFiles`         | `true`   | Read files as data URLs; false passes the first selected File object.                                          |
| `debug`               | `false`  | Log exceptions thrown by persistence callbacks after their first completion.                                   |
| `inlineEdit`          | disabled | Set true or configure enabled, submitOnBlur, selectText, and tabNavigation.                                    |

The callbacks and the first three options also work at the DataTable root level. Configure translations with `language.altEditor` or load a JSON translation using `language.altEditorUrl`. Missing translation keys use English defaults. Translation files are included under `translations/`; see the [supported languages and configuration guide](translations.md).

Invalid automatic editor configuration is logged to the console and leaves DataTables usable without an editor. Explicit constructor or accessor initialization throws configuration errors to the caller.

## Persistence callbacks

```js
onAddRow(editor, rowData, success, error);
onEditRow(editor, rowData, success, error, originalRowData);
onDeleteRow(editor, rowData, success, error);
onInlineEditRow(editor, rowData, success, error, originalRowData, meta);
```

The first argument is always the AltEditor instance; `editor.api()` returns its DataTables API. Existing `editor.s.dt` access remains available for compatibility.

Dialog add/edit callbacks receive enabled form values; disabled controls are omitted. Delete receives an array of the captured rows. Inline editing receives a complete candidate row and a snapshot of the original row. Inline editing uses `onEditRow` if `onInlineEditRow` is absent. If no applicable callback is supplied, the update succeeds locally.

Call `success(persistedRow)` with a row object or array. Calling `success()` uses the submitted candidate; dialog editing preserves fields outside the form. JSON row strings are accepted. Delete ignores the response body. Call `error(errorValue)` to retain the form for correction and retry. Error content is rendered as text. Only the first success or error settlement is accepted, and callbacks completed after destruction are ignored.

Dialog editing captures eligible fields before asynchronous collection and constructs its candidate before invoking persistence. Changing form controls or disabling them while the request is pending does not change the submitted candidate. Return `success(persistedRow)` explicitly for server-adjusted data.

Assign this function to `onEditRow` in the DataTable configuration:

```js
function savePerson(editor, rowData, success, error, originalRowData) {
  $.ajax({
    url: '/people/' + encodeURIComponent(originalRowData.id),
    method: 'PATCH',
    contentType: 'application/json',
    data: JSON.stringify(rowData),
    success,
    error,
  });
}
```

The target is captured when editing starts and does not change if table selection changes. Configure DataTables `rowId` with a unique, stable identifier when data can reload during editing or persistence. Without it, replacing row objects through Ajax or `clear().rows.add()` can make the original target unidentifiable, even if the new row has similar values. Such results are rejected instead of being applied to another row. Tables on the same page should use distinct row ID prefixes when their identifiers overlap.

## Public methods

| Method                           | Purpose                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `api()`                          | Return the DataTables API.                                                           |
| `openAddDialog()`                | Open an add form.                                                                    |
| `openEditDialog(rowSelector?)`   | Edit one explicit or selected row.                                                   |
| `openDeleteDialog(rowSelector?)` | Delete explicit or selected rows.                                                    |
| `refresh()`                      | Reload Ajax data or redraw client data without resetting paging.                     |
| `startInlineEdit(cellSelector)`  | Start an eligible visible cell; return a boolean.                                    |
| `commitInlineEdit()`             | Validate and start persistence; return a boolean, not a persistence result.          |
| `cancelInlineEdit()`             | Cancel an unsaved cell; return a boolean.                                            |
| `isInlineEditing()`              | Report editing or pending cell persistence.                                          |
| `reloadOptions(select, options)` | Replace options in a native or enhanced select; accepts an element or jQuery object. |
| `destroy()`                      | Release listeners, plugins, and dialog elements; also called on table destruction.   |

`_openAddModal`, `_openEditModal`, and `_openDeleteModal` are deprecated aliases for the corresponding public methods. Dialog submissions are bound automatically.

Without an explicit row selector, edit and delete use the Select extension. Edit requires exactly one row; delete requires at least one. Without Select, pass a selector explicitly. Rejected dialog opening returns `false`; successful opening has no return value. Missing framework and selection messages appear beside the table when no dialog is open.

## Column options

| Options                                                                       | Behavior                                                                                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `editable`, `visible`                                                         | Exclude a field from dialog editing or hide its dialog row.                                                                                    |
| `type`                                                                        | Native input type, select, or textarea. Radio fields are excluded. The deprecated readonly type maps to a readonly text input.                 |
| `readonly`, `disabled`, `required`                                            | Standard control attributes; disabled controls are omitted from dialog submissions.                                                            |
| `title`, `placeholder`, `hoverMsg`                                            | Field label, placeholder, and input tooltip. Text is not interpreted as HTML.                                                                  |
| `pattern`, `maxLength`, `min`, `max`, `step`                                  | Native constraint validation where applicable to the input type.                                                                               |
| `unique`, `uniqueMsg`                                                         | Validate uniqueness among loaded rows. The message uses uniqueMsg or language.error.unique.                                                    |
| `value`                                                                       | Default add-dialog value; edit dialogs read the current row.                                                                                   |
| `options`, `multiple`, `optionsSortByLabel`                                   | Select values, multiple selection, and label sorting. Options accept primitive arrays, value/label or id/text objects, or value-to-label maps. |
| `rows`, `cols`                                                                | Textarea dimensions.                                                                                                                           |
| `accept`, `maxFileSize`                                                       | File input type hint and optional nonnegative size limit in bytes.                                                                             |
| `style`                                                                       | Dialog control inline styles, as a string or property object.                                                                                  |
| `select2`, `datepicker`, `datetimepicker`                                     | Optional dialog plugin configuration; meaningful native controls remain usable when plugins are absent.                                        |
| `dateFormat`, `dateInputFormat`                                               | Format dialog date/time values using Moment when available; parse strictly with the input format or ISO 8601.                                  |
| `editorOnChange(event, editor)`                                               | Handle a dialog field change.                                                                                                                  |
| `inline`                                                                      | Compact dialog field layout; this is distinct from cell editing.                                                                               |
| `special`                                                                     | Deprecated compatibility data attribute; has no built-in validation behavior.                                                                  |
| `inlineEditable`, `inlineEditType`, `inlineEditOptions`, `inlineEditSetValue` | Cell editing eligibility, control type, control options, and explicit row setter.                                                              |

Object rows, numeric array sources including 0, and dotted object paths are supported. Writable paths containing `__proto__`, `prototype`, or `constructor` are rejected, while unrelated metadata with those names is preserved when rows are copied. Complex DataTables sources, including bracket, function, and escaped-dot notation, need an explicit setter for inline editing and are excluded from dialogs. Dialogs also exclude radio fields and fields with an empty title, except hidden inputs. Use a titled select for a single choice or `editable: false` to explicitly exclude a column.

Uniqueness compares text and select values as strings, number fields numerically, and multiple selections by overlapping values. Empty values do not count as duplicates; use `required` when a value is mandatory. `optionsSortByLabel` uses the browser's default locale. Supply options in the desired order without this option when applications require a fixed ordering.

Native date, time, and datetime-local controls require values such as `2026-09-11`, `14:30`, and `2026-09-11T14:30`. Store native-compatible values and use a DataTables renderer for presentation. Dialog `dateFormat` also applies to time fields; custom source formats require `dateInputFormat` to avoid ambiguous parsing. Inline controls use raw values without Moment conversion.

`maxFileSize` applies before reading files with either `encodeFiles` setting. Omitting it preserves unrestricted file size behavior. For large files, use `encodeFiles: false` and upload the File separately rather than storing a data URL in table data. Applications must enforce file restrictions on the server as well.

For forms with multiple file fields, all field values and file size limits are checked before encoded file reads start. Correct an invalid file selection and submit again to retry.

## Server-side data

With `serverSide: true`, the editor only has the currently loaded row snapshot. Unique validation covers loaded data, so applications must also validate on the server. Server draws remain authoritative. Use stable row IDs and reload with `editor.api().ajax.reload(null, false)` after persistence when necessary. A result for a row no longer available on the client is reported as an error instead of being applied elsewhere.

## Module loading

Use `dist/dataTables.altEditor.min.js` for minified JavaScript. Both builds include source maps and an MIT license banner. AMD consumers map `jquery` and `datatables.net`. CommonJS consumers can load the package after initializing their browser environment, or call its exported factory with `(window, jQuery)` when no global window exists. The factory returns the AltEditor constructor.

Each loaded module uses one window and jQuery context. Load a separate copy within each iframe; do not reuse one CommonJS module factory across multiple active windows.

See [inline editing](inline-edit.md), [events](events.md), and [troubleshooting](troubleshooting.md) for related behavior.

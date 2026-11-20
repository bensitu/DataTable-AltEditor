# Configuration and API

[Documentation](README.md) · [Project overview](../README.md)

Use `altEditor: true` for row dialogs or an options object to customize behavior. `table.altEditor()` returns the existing editor or `null`; `table.altEditor(options)` creates one when absent. `DataTable.altEditor` exposes the constructor. The [quick start](../README.md#get-started) shows initialization and dependencies.

## Configuration

Configuration precedence is: AltEditor defaults, `DataTable.defaults.altEditor`, root-level compatibility options, then the instance `altEditor` object. Explicit constructor options are applied last. Functions retain their references, arrays are shallow-copied and replaced, and unsafe object keys are rejected. Objects inside configuration arrays retain their references; treat them as read-only after initialization.

| Option                | Default                                                                             | Behavior                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `fields`              | `null`                                                                              | Optional independent dialog fields with explicit read/write conversion. See [form fields](form-fields.md).     |
| `dialog`              | `{ framework: 'auto', templates: { add: null, edit: null }, deleteDetails: false }` | [Dialog templates, presentation, and callbacks](dialogs.md). Configure inside `altEditor`.                     |
| `closeModalOnSuccess` | `true`                                                                              | Close a successful dialog. When false, show success and disable further submission until another dialog opens. |
| `encodeFiles`         | `true`                                                                              | Read files as data URLs; false passes the first selected File object.                                          |
| `debug`               | `false`                                                                             | Log exceptions thrown by persistence callbacks after their first completion.                                   |
| `persistenceTimeout`  | `0`                                                                                 | Maximum time in milliseconds to wait for the persistence callback. Zero disables the timeout.                  |
| `inlineEdit`          | disabled                                                                            | Set true or configure enabled, submitOnBlur, selectText, tabNavigation, and persistUnchanged.                  |

The callbacks, `closeModalOnSuccess`, `encodeFiles`, and `debug` also work at the DataTable root level. Configure translations with `language.altEditor` or load a JSON translation using `language.altEditorUrl`. Missing translation keys use English defaults. Translation files are included under `translations/`; see the [supported languages and configuration guide](translations.md).

Invalid automatic editor configuration is logged to the console and leaves DataTables usable without an editor. Explicit constructor or accessor initialization throws configuration errors to the caller.

## Persistence callbacks

```js
onAddRow(editor, rowData, success, error);
onEditRow(editor, rowData, success, error, originalRowData);
onDeleteRow(editor, rowData, success, error);
onInlineEditRow(editor, rowData, success, error, originalRowData, meta);
```

The first argument is always the AltEditor instance; `editor.api()` returns its DataTables API. Existing `editor.s.dt` access remains available for compatibility.

Dialog add/edit callbacks receive enabled form values after any explicit `setValue` conversions; disabled controls are omitted. Delete receives an array of the captured rows. Inline editing receives a complete candidate row and a snapshot of the original row. Inline editing uses `onEditRow` if `onInlineEditRow` is absent. If no applicable callback is supplied, the update succeeds locally.

Set `persistenceTimeout` inside `altEditor` to report an error when a callback does not settle before the deadline. The editor retains the input and ignores that operation's late results. Configure your transport timeout separately. An editor timeout cannot cancel a server write, so check the saved state before retrying. Returning a Promise or thenable settles persistence through its resolution or rejection. Resolving `undefined` is equivalent to `success()`. Normal non-thenable return values are ignored.

Call `success(persistedRow)` with a row object or array. Calling `success()` uses the submitted candidate; dialog editing preserves fields outside the form. JSON row strings are accepted. Delete ignores the response body. Call `error(errorValue)` to retain the form for correction and retry. Error content is rendered as text. Only the first callback, Promise, or synchronous exception settlement is accepted, and callbacks completed after destruction are ignored.

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
| `commitInlineEdit()`             | Return true if the edit closes unchanged or begins submission.                       |
| `cancelInlineEdit()`             | Cancel an unsaved cell; return a boolean.                                            |
| `isInlineEditing()`              | Report editing or pending cell persistence.                                          |
| `reloadOptions(select, options)` | Replace options in a native or enhanced select; accepts an element or jQuery object. |
| `destroy()`                      | Release listeners, plugins, and dialog elements; also called on table destruction.   |

`_openAddModal`, `_openEditModal`, and `_openDeleteModal` are deprecated aliases for the corresponding public methods. Dialog submissions are bound automatically.

Without an explicit row selector, edit and delete use the Select extension. Edit requires exactly one row; delete requires at least one. Without Select, pass a selector explicitly. Rejected dialog opening returns `false`; successful opening has no return value. Missing framework and selection messages appear beside the table when no dialog is open.

See [persistence and field validation](validation.md) for Promise examples, structured `fieldErrors`, validation order, and `editorValidate`.

## Column options

Dialog control options also apply to independent `altEditor.fields`. See [form fields and value conversion](form-fields.md) for `name`, `getValue`, and `setValue`. Inline options continue to belong to table columns.

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
| `dateFormat`, `dateInputFormat`                                               | Format dialog date/time values using Moment on `window.moment` when available; parse strictly with the input format or ISO 8601.               |
| `editorValidate(value, context)`                                              | Synchronous or asynchronous field validation; see [custom validators](validation.md#custom-validators).                                        |
| `editorOnChange(event, editor)`                                               | Handle a dialog field change.                                                                                                                  |
| `inline`                                                                      | Compact dialog field layout; this is distinct from cell editing.                                                                               |
| `special`                                                                     | Deprecated compatibility data attribute; has no built-in validation behavior.                                                                  |
| `inlineEditable`, `inlineEditType`, `inlineEditOptions`, `inlineEditSetValue` | Cell editing eligibility, control type, control options, and explicit row setter.                                                              |

Object rows, numeric array sources including 0, and dotted object paths are supported. Writable paths containing `__proto__`, `prototype`, or `constructor` are rejected, while unrelated metadata with those names is preserved when rows are copied. Complex DataTables sources, including bracket, function, and escaped-dot notation, need an explicit setter for inline editing and are excluded from dialogs. Dialogs also exclude radio fields and fields with an empty title, except hidden inputs. Use a titled select for a single choice or `editable: false` to explicitly exclude a column.

Uniqueness is checked on control change and again on submission, against loaded rows only. Enforce uniqueness on the server to cover unloaded records and concurrent writes. Use `editorValidate` for remote feedback and enforce the constraint in the persistence endpoint. Uniqueness compares text and select values as strings, number fields numerically, and multiple selections by overlapping values. Empty values do not count as duplicates; use `required` when a value is mandatory. `optionsSortByLabel` uses the browser's default locale. Supply options in the desired order without this option when applications require a fixed ordering.

Missing or null intermediate path values are initialized as objects or arrays. Writable paths traverse plain objects and arrays. Writing through an existing scalar, Date, File, Map, or other non-plain intermediate value fails without replacing it. Numeric path segments can address arrays or object properties. Column-derived dialogs reject duplicate or ancestor/descendant field paths among submitted controls; mark duplicate display columns `editable: false` or configure independent fields. Disabled controls do not participate in this path validation because they are omitted from submission.

Object and array values are omitted from incompatible dialog controls, which are empty and disabled; edit submissions preserve the original field. Multiple selects accept arrays. Inline editing rejects structured values unless a multiple select or an explicit `inlineEditSetValue` handles them. Use scalar nested paths, explicit dialog value converters, or `editable: false` for structured columns.

Dialog text and number fields retain HTML form string values; use `setValue` or convert numeric values in the persistence callback when the data model requires numbers. Checkboxes return booleans and multiple selects return arrays of strings. Inline number controls return numbers.

Stored select values absent from the initial options are included as plain-text options so opening an editor does not discard them. Single selections preserve literal JSON strings; multiple selections also accept JSON arrays unless the string itself matches an option. `reloadOptions()` intentionally replaces the available choices and only retains values present in the new list, which is useful for dependent fields. Validate required choices after reloading.

Native date, time, and datetime-local controls require values such as `2026-09-11`, `14:30`, and `2026-09-11T14:30`. Store native-compatible values and use a DataTables renderer for presentation. Dialog `dateFormat` also applies to time fields; custom source formats require `dateInputFormat` to avoid ambiguous parsing. Inline controls use raw values without Moment conversion.

Set `maxFileSize` when accepting files: data URL encoding reads the entire file and retains an enlarged string in row data. `maxFileSize` applies before reading files with either `encodeFiles` setting. Omitting it preserves unrestricted file size behavior. For large files, use `encodeFiles: false` and upload the File separately rather than storing a data URL in table data. Applications must enforce file restrictions on the server as well.

For forms with multiple file fields, all field values and file size limits are checked before encoded file reads start. Correct an invalid file selection and submit again to retry.

Pending encoded file reads are aborted when the dialog closes or the editor is destroyed. Results from an interrupted operation cannot invoke persistence.

A required file field requires a selection when adding a record or editing a record without an attachment. Editing a record with an existing attachment permits retaining it without uploading a replacement.

## Rendering table values

AltEditor sends raw values to persistence and to DataTables. Use `render: DataTable.render.text()` for user-entered strings so the display renderer escapes them. For custom display, create a DOM node and assign its `textContent`. When returning an HTML string from a renderer, escape user-controlled values for their output context. See the [DataTables security guide](https://datatables.net/manual/core/security).

## Server-side data

For a complete PHP/MySQL integration with `serverSide: true`, see [Example 23](../example/23_php_mysql/README.md). It includes database setup, server paging, search, ordering, JSON writes, and server-side validation.

For complete local HTTP persistence and raw file uploads, see [Example 16](../example/16_server_files/README.md). For deleting multiple selected rows, see [Example 15](../example/15_bulk_delete/example15.js).

With `serverSide: true`, the editor only has the currently loaded row snapshot. Unique validation covers loaded data, so applications must also validate on the server. Server draws remain authoritative. Use stable row IDs and reload with `editor.api().ajax.reload(null, false)` after persistence when necessary. A result for a row no longer available on the client is reported as an error instead of being applied elsewhere.

## Module loading

The npm package is `@bensitu/datatable-alteditor`. Its `main` entry loads the readable UMD JavaScript, while `style` points to the minified CSS. Import `@bensitu/datatable-alteditor/dist/dataTables.altEditor.css` or its minified variant explicitly when using a bundler. JavaScript imports do not automatically load CSS. DataTables and jQuery remain peer dependencies. Optional frameworks and controls are installed separately.

Use `dist/dataTables.altEditor.min.js` for minified JavaScript. Both builds include source maps and an MIT license banner. AMD consumers map `jquery` and `datatables.net`. CommonJS consumers can load the package after initializing their browser environment, or call its exported factory with `(window, jQuery)` when no global window exists. The factory returns the AltEditor constructor.

Each loaded module uses one window and jQuery context. Load a separate copy within each iframe; do not reuse one CommonJS module factory across multiple active windows.

See [inline editing](inline-edit.md), [events](events.md), and [troubleshooting](troubleshooting.md) for related behavior.

## jQuery compatibility

The peer range is `>=1.8 <4.0.0`. Use jQuery 3.8.0 with the bundled examples and choose a jQuery 3.x version with current security fixes for deployed applications. jQuery 3.5.0 fixed security issues in DOM manipulation. Optional frameworks and plugins may require a narrower range. See the [jQuery 3.5.0 release notes](https://blog.jquery.com/2020/04/10/jquery-3-5-0-released/).

jQuery 4 uses a separate entry point for CommonJS initialization without a global window. Bootstrap 4.6.2 rejects jQuery 4, and Foundation 6.9.0 uses a collection method it removed. See the [jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/).

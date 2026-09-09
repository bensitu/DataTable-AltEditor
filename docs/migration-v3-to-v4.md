# Migrating from v3 to v4

## Dependencies and paths

Use DataTables `>=2.1.0 <3`. DataTables 1.x and 3.x are not supported. Examples use DataTables 2.3.8, Buttons 3.2.6, Select 3.1.3, jQuery 3.7.1, and Bootstrap 5. Foundation Reveal 6 and Bootstrap 4 integrations remain available. Bootstrap 3 compatibility is best effort.

Replace `src/dataTables.altEditor.free.js` script references with `dist/dataTables.altEditor.js` or its minified variant, and include `dist/dataTables.altEditor.css`. The distribution is included in the repository. Run `npm ci` and `npm run build` when rebuilding after source changes, and commit the updated distribution. Source files are ES modules and must not be loaded as the browser distribution. jQuery and DataTables are peer dependencies and are not bundled.

The package name remains `datatables.net-AltEditor`. The main entry now points to `dist/dataTables.altEditor.js`. The generated npm archive includes the distribution, source maps, translations, license, and user documentation. No TypeScript declarations are generated.

## Configuration and methods

`altEditor: true` and root-level onAddRow, onEditRow, onDeleteRow, closeModalOnSuccess, encodeFiles, and debug remain accepted. Prefer the object form for editor options:

```js
altEditor: { closeModalOnSuccess: true, inlineEdit: { enabled: true } }
```

Obtain the instance through `table.altEditor()` and its table through `editor.api()`. The constructor remains available as `DataTable.altEditor`. Use `openAddDialog()`, `openEditDialog(rowSelector?)`, and `openDeleteDialog(rowSelector?)`. The corresponding `_open*Modal` methods are deprecated aliases. Do not bind form submission yourself; public dialog methods already bind it.

Buttons and Select are optional. Without Select, pass explicit row selectors to edit and delete methods. Existing callback argument order is unchanged, including the editor as the first argument and original row data as the fifth edit argument. Only the first success or error completion is accepted; repeated completions are ignored. Errors render as text.

`uniqueMsg` now supplies the unique validation message, with `language.error.unique` as its fallback. `special` is retained as a deprecated data attribute and has no built-in behavior. Unused defaults named alwaysAsk, focus, columns, update, and editor have been removed. Deprecated readonly field types map to readonly text controls.

## Cell editing

Inline editing is disabled unless explicitly enabled. `columns[].inline` still controls dialog layout. New cell options are inlineEditable, inlineEditType, inlineEditOptions, and inlineEditSetValue. File, hidden, readonly, disabled, and action columns cannot enter cell editing.

Inline persistence calls `onInlineEditRow` when supplied and otherwise falls back to `onEditRow`. If your edit callback expects only dialog fields, handle the complete inline candidate row or provide a separate inline callback. Use the returned server row or `success()` to accept the candidate. Row IDs help preserve target identity across asynchronous draws.

See [inline editing](inline-edit.md) for keyboard behavior, supported controls, and server-side limitations. See [events](events.md) for the new DataTables events; existing modal event names remain unchanged. The custom action example is now in `example/12_custom_action_buttons/`, and cell editing is demonstrated in `example/13_inline_edit/`.

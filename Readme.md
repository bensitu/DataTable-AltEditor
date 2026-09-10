# DataTables AltEditor

AltEditor 4.0.1 adds row dialogs and cell inline editing to DataTables 2.x. It is a JavaScript library with modular source and readable or minified UMD distribution files. jQuery and DataTables remain external peer dependencies.

## Requirements

- DataTables `>=2.1.0 <3`; examples use 2.3.8. DataTables 1.x and 3.x are outside this version's support scope.
- jQuery `>=1.8 <5`; examples use 3.7.1. Choose a version supported by your DataTables and optional plugins.
- Dialogs require Bootstrap 5, Bootstrap 4, or Foundation Reveal 6. Bootstrap 3 has best-effort compatibility.
- Inline editing uses native controls and does not require a dialog framework.
- Buttons and Select are optional. Programmatic dialog methods work without either extension when you provide row selectors.
- Use a current browser supported by DataTables 2.x. Internet Explorer is not supported. Runtime JavaScript uses ES2015 syntax without a transpiler or bundled polyfills.

## Installation

The repository includes ready-to-use files in `dist/`. A compressed stylesheet, `dist/dataTables.altEditor.min.css`, is available with an external source map containing the original CSS. Use it in place of `dist/dataTables.altEditor.css` for production. Rebuild distribution files after changing source files with Node.js 24 and npm:

```sh
npm ci
npm run build
npm pack
```

The package retains the name `datatables.net-AltEditor`. To install the generated npm archive into an application:

```sh
npm install /path/to/datatables.net-AltEditor-4.0.1.tgz jquery@3.7.1 datatables.net@2.3.8
```

These instructions install a locally built archive; they do not require a published 4.0.1 registry release.

For browser usage, load jQuery, DataTables, optional extensions, and your dialog framework before AltEditor:

```html
<link rel="stylesheet" href="dist/dataTables.altEditor.css" />
<script src="dist/dataTables.altEditor.js"></script>
```

Use `dist/dataTables.altEditor.min.js` for minified JavaScript. Both builds include source maps and an MIT license banner. AMD consumers map `jquery` and `datatables.net`. CommonJS consumers can load the package after initializing their browser environment, or call its exported factory with `(window, jQuery)` when no global window exists. The factory returns the AltEditor constructor.

Each loaded module uses one window and jQuery context. Load a separate copy within each iframe; do not reuse one CommonJS module factory across multiple active windows.

## Usage

```js
const table = new DataTable('#people', {
  data: [{ id: 'alice', user: { name: 'Alice' }, age: 30 }],
  rowId: 'id',
  columns: [
    { data: 'user.name', title: 'Name', required: true },
    { data: 'age', title: 'Age', type: 'number', min: 0 },
  ],
  altEditor: {
    closeModalOnSuccess: true,
    encodeFiles: true,
    inlineEdit: { enabled: true },
  },
});

const editor = table.altEditor();
editor.openEditDialog('#alice');
```

Use `altEditor: true` for dialogs with inline editing disabled. Both `new DataTable()` and jQuery `$('#people').DataTable()` initialization are supported. `DataTable.altEditor` exposes the constructor. `table.altEditor()` returns the existing instance or `null`; `table.altEditor(options)` creates an instance when absent and never duplicates one already attached.

To use toolbar actions, load Buttons and Select and add `layout: { topStart: 'buttons' }`, `select: 'single'`, and button definitions with names `add`, `edit`, `delete`, or `refresh`. Button names select the corresponding action. Dialog edit and delete methods use selected rows when no explicit row selector is given; editing requires one row and deletion accepts multiple rows.

Without Select, edit and delete methods require an explicit row selector. Invalid selection and missing dialog framework errors are visible beside the table when no dialog is open. Dialog opening returns `false` when rejected; successful opening has no return value.

### Configuration

Configuration precedence is: AltEditor defaults, `DataTable.defaults.altEditor`, root-level compatibility options, then the instance `altEditor` object. Explicit constructor options are applied last. Functions retain their references, arrays are copied and replaced, and unsafe object keys are rejected.

| Option                | Default  | Behavior                                                                                                       |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `closeModalOnSuccess` | `true`   | Close a successful dialog. When false, show success and disable further submission until another dialog opens. |
| `encodeFiles`         | `true`   | Read files as data URLs; false passes the first selected File object.                                          |
| `debug`               | `false`  | Log exceptions thrown by persistence callbacks after their first completion.                                   |
| `inlineEdit`          | disabled | Set true or configure enabled, submitOnBlur, selectText, and tabNavigation.                                    |

The callbacks and the first three options also work at the DataTable root level. Configure translations with `language.altEditor` or load a JSON translation using `language.altEditorUrl`. Missing translation keys use English defaults. Translation files are included under `translations/`; see the [supported languages and configuration guide](docs/translations.md).

Invalid automatic editor configuration is logged to the console and leaves DataTables usable without an editor. Explicit constructor or accessor initialization throws configuration errors to the caller.

### Persistence callbacks

```js
onAddRow(editor, rowData, success, error);
onEditRow(editor, rowData, success, error, originalRowData);
onDeleteRow(editor, rowData, success, error);
onInlineEditRow(editor, rowData, success, error, originalRowData, meta);
```

The first argument is always the AltEditor instance; `editor.api()` returns its DataTables API. Existing `editor.s.dt` access remains available for compatibility.

Dialog add/edit callbacks receive enabled form values; disabled controls are omitted. Delete receives an array of the captured rows. Inline editing receives a complete candidate row and a snapshot of the original row. Inline editing uses `onEditRow` if `onInlineEditRow` is absent. If no applicable callback is supplied, the update succeeds locally.

Call `success(persistedRow)` with a row object or array. Calling `success()` uses the submitted candidate; dialog editing preserves fields outside the form. JSON row strings are accepted. Delete ignores the response body. Call `error(errorValue)` to retain the form for correction and retry. Error content is rendered as text. Only the first success or error settlement is accepted, and callbacks completed after destruction are ignored.

```js
onEditRow(editor, rowData, success, error, originalRowData) {
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

### Public methods

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

### Column options

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

## Inline editing and events

Double-click a supported cell to edit. Enter saves, Escape cancels, and Tab or Shift+Tab saves before moving to another editable visible cell in the same row. Composition input does not submit on Enter. By default, blur cancels; `submitOnBlur: true` saves instead. A pending save cannot be canceled. Failed saves remain editable, and the table cache changes only after success.

See [inline editing](docs/inline-edit.md), [events](docs/events.md), and [migration from v3](docs/migration-v3-to-v4.md) for complete configuration and lifecycle behavior. Events use the DataTables/jQuery .dt channel; both pre-submit events support preventDefault(). Existing modal events remain available.

## Server-side data

With `serverSide: true`, the editor only has the currently loaded row snapshot. Unique validation covers loaded data, so applications must also validate on the server. Server draws remain authoritative. Use stable row IDs and reload with `editor.api().ajax.reload(null, false)` after persistence when necessary. A result for a row no longer available on the client is reported as an error instead of being applied elsewhere.

## Examples and development

The example directory and individual pages share responsive styling in `example/examples.css`. Table containers allow horizontal scrolling when needed. Dialog fields stack on small screens, and long forms scroll inside the dialog while its header and actions remain visible. Include `dist/dataTables.altEditor.css` after the framework stylesheet to apply editor layout and control styles.

Examples use a shared DataTables table presentation, with Bootstrap dialogs in examples 1–10 and 12, Foundation dialogs in example 11, and native cell controls in example 13. The Appearance selector follows the system preference by default and remembers an explicit light or dark selection. `example/theme.js` and `example/examples.css` are demonstration assets; applications do not need them.

See [styling and themes](docs/styling.md) for color modes, CSS custom properties, and application overrides.

See the [example guide](docs/examples.md) for the controls to try in each page and the limits of simulated persistence.

Run `npm ci` and `npm run dev`, then open [the example index](http://127.0.0.1:8080/). Rebuild first if source files have changed. Examples include arrays, objects, Ajax, multiple tables, optional controls, dependent selects, validation, translations, files, Foundation, [custom action buttons](example/12_custom_action_buttons/example12.html), and [cell editing](example/13_inline_edit/example13.html). Examples load `dist/` and require internet access for CDN dependencies. Ajax examples use static demonstration responses; they do not persist changes to a server.

```sh
npm run format:check
npm run lint
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

`npm run test:watch` runs interactive unit tests. `npm run test:coverage` measures all JavaScript under `src/` and requires at least 80% aggregate statement, branch, function, and line coverage. CI runs this command; browser tests are verified separately and are not included in these percentages. Tests cover dialog and inline editing, value conversion, validation, persistence failures, optional controls, and framework lifecycle behavior. `npm run build` reports readable, minified, and gzip sizes without a size threshold. Commit the generated JavaScript, source maps, and CSS in `dist/` together with relevant source changes. Coverage and browser output are not tracked. Edit source files rather than generated distribution files.

For compatibility verification, install all Playwright browsers and run `npm run test:compat`. This checks DataTables 2.1.8, Firefox, WebKit, Bootstrap 4, and Foundation. Run `npm pack --dry-run` to inspect the npm file list. Source is organized under core, data, dialog, crud, inline, and style directories; the build uses Rollup without Babel, TypeScript, or runtime polyfills.

## License

MIT. See [LICENSE](LICENSE) and [CHANGELOG.md](CHANGELOG.md) for attribution and release history.

# Examples

[Documentation](README.md) · [Project overview](../README.md)

Browse the [live example directory](https://bensitu.github.io/DataTable-AltEditor/) without installing anything. Source files are available in [example/](../example/).

To run locally, install development dependencies with `npm ci`, run `npm run build`, then run `npm run dev` and open the [example directory](http://127.0.0.1:8080/). Serve the pages over HTTP rather than opening HTML files directly. The examples require access to their CDN dependencies.

In-memory examples reset on page reload. Example 16 saves to its local Node.js server and retains records and attachments across page reloads until that server restarts. The other Ajax examples load static JSON and acknowledge writes without a persistent backend; their Refresh buttons restore the original rows. Newly added records receive a generated identifier within their table.

Ajax examples configure stable DataTables row identifiers so updates can find the same record after a reload. The multiple-table example prefixes identifiers to keep DOM IDs distinct. Client-generated identifiers and GET requests to static response files are demonstration techniques. Production applications should assign identifiers on the server, use appropriate write methods, and validate and authorize every operation.

Simulated save requests do not send row values in query strings. They call `success()` to accept the entered values locally after the static request completes. For a real persistence callback, see the PATCH example in the [API reference](api.md#persistence-callbacks).

CDN resources are convenient for these examples. For production deployments, manage dependencies locally or pin resources with matching Subresource Integrity metadata and a suitable Content Security Policy.

## Choose by integration need

- **Start with a normal object table:** use Example 02. Use Example 01 when your rows are arrays.
- **Load and save remote data:** start with Example 03, then replace the simulated callbacks with the [persistence callback contract](api.md#persistence-callbacks). Example 05 adds independent tables.
- **Customize a row form:** use Example 04 for field options, 06 for Select2 and date pickers, 07 for dependent selects, and 08 for validation.
- **Adapt the interface:** use Example 09 for translation loading, 11 for Foundation, and 12 for custom action buttons and mobile row actions.
- **Attach files:** use Example 10 for browser-side data URLs and attachment retention.
- **Edit directly in cells:** use Example 13. Its native controls do not need Bootstrap, Foundation, Select2, or date picker plugins.

- **Combine custom controls with inline editing:** use Example 14 for direct controls, local data updates, and explicit column exclusions.

- **Delete several rows:** use Example 15 for multiple selection and the retained success dialog.
- **Save records and upload raw files:** use Example 16 and its [local server instructions](../example/16_server_files/README.md).
- **Customize inline controls:** use Example 17 for formatted values, explicit setters, blur saving, and the public API.

## Try the features

For toolbar-based examples, select a row before choosing Edit or Delete. Add opens a new record form. Example 12 uses its own actions; Example 13 uses double-click cell editing.

| Example                                                                                                                  | What to try                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01: Arrays](https://bensitu.github.io/DataTable-AltEditor/example/01_in_memory_arrays/example1.html)                    | Add, edit, and delete array rows; edit multiline text in the Position field.                                                                                                                                                |
| [02: Objects](https://bensitu.github.io/DataTable-AltEditor/example/02_in_memory_objects/example2.html)                  | Edit named object fields and add a record with a generated identifier.                                                                                                                                                      |
| [03: Ajax](https://bensitu.github.io/DataTable-AltEditor/example/03_ajax_objects/example3.html)                          | Save a change, see the submitted values in the table, then use Refresh to restore the static data.                                                                                                                          |
| [04: Field options](https://bensitu.github.io/DataTable-AltEditor/example/04_more/DataTableExample.html)                 | Change the on/off selection, enter a unique IPv4 address, and enter a single port from 0 to 65535. The read-only field remains unchanged. Also compare readonly and disabled values, sorted options, and add-form defaults. |
| [05: Multiple tables](https://bensitu.github.io/DataTable-AltEditor/example/05_two_datatables/example5.html)             | Edit either table and verify the other table retains its data. Each table has its own actions and generated identifiers.                                                                                                    |
| [06: Select2 and dates](https://bensitu.github.io/DataTable-AltEditor/example/06_select_datepicker/example6.html)        | Change the position, multiple friends, date, timestamp, and degree. Save and reopen the row to see the retained values.                                                                                                     |
| [07: Dependent fields](https://bensitu.github.io/DataTable-AltEditor/example/07_dependent_select/example7.html)          | Choose Italy or France and then a town from the loaded options. Germany hides and clears the town field. Failed option requests prevent saving until the country is changed and the options load successfully.              |
| [08: Validation](https://bensitu.github.io/DataTable-AltEditor/example/08_validation/example8.html)                      | Try an empty required name, a duplicate name or number, and a duplicate selection. Options 7 and 8 are initially unused. Salaries use grouped dollar notation such as `$1,000` or `$1,200,000`.                             |
| [09: Translations](https://bensitu.github.io/DataTable-AltEditor/example/09_translations/example9.html)                  | Open the add, edit, and delete dialogs to see Italian labels loaded from the translation file. The second table demonstrates partial language overrides with English fallbacks.                                             |
| [10: Files](https://bensitu.github.io/DataTable-AltEditor/example/10_file_upload/example10.html)                         | Attach a small file, save, and download its contents from the table. A later edit without a new file retains the attachment. Files are read as data URLs in browser memory; no file upload service is provided.             |
| [11: Foundation](https://bensitu.github.io/DataTable-AltEditor/example/11_foundation/example11.html)                     | Add, edit, and delete rows through Foundation Reveal dialogs.                                                                                                                                                               |
| [12: Custom actions](https://bensitu.github.io/DataTable-AltEditor/example/12_custom_action_buttons/example12.html)      | Use Add record, click a row to edit, or choose its Delete action. On small screens, expand the row to access hidden columns and actions.                                                                                    |
| [13: Cell editing](https://bensitu.github.io/DataTable-AltEditor/example/13_inline_edit/example13.html)                  | Double-click to edit; Enter saves, Escape cancels, and Tab moves. Try Fail the next save to retry. The second table demonstrates numeric array sources.                                                                     |
| [14: Rendered controls](https://bensitu.github.io/DataTable-AltEditor/example/14_rendered_controls/example14.html)       | Change select, number, checkbox, and textarea values directly. Try editable content, buttons, links, expandable details, and a custom switch. Double-click ordinary or bold task text to edit.                              |
| [15: Multiple-row deletion](https://bensitu.github.io/DataTable-AltEditor/example/15_bulk_delete/example15.html)         | Select multiple rows and delete them together. Successful dialogs remain open; close them to continue.                                                                                                                      |
| [16: Server persistence and files](https://bensitu.github.io/DataTable-AltEditor/example/16_server_files/example16.html) | Run the local server to create, edit, delete, upload, download, and reload real saved data. Try a duplicate name to see server validation.                                                                                  |
| [17: Advanced inline editing](https://bensitu.github.io/DataTable-AltEditor/example/17_inline_options/example17.html)    | Try blur saving, public edit controls, formatted numbers, checkboxes, and a function-based source with an explicit setter.                                                                                                  |

The Appearance selector supports system, light, and dark modes. See [styling and themes](styling.md) for application customization.

The file example limits each attachment to 2 MiB through `maxFileSize`. This client-side check prevents unnecessary reads; an upload service must enforce its own limits.

## Find the configuration

Open the HTML first to see stylesheet and script loading order, then read the table configuration. Each example page links directly to its configuration source. Example 04 keeps its configuration inside the HTML; the others use a separate JavaScript file.

| Example | Page and configuration                                                                                                      | What to reuse                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 01      | [HTML](../example/01_in_memory_arrays/example1.html) · [JavaScript](../example/01_in_memory_arrays/example1.js)             | Numeric column sources and textarea fields for array rows.                                         |
| 02      | [HTML](../example/02_in_memory_objects/example2.html) · [JavaScript](../example/02_in_memory_objects/example2.js)           | Named column sources, readonly IDs, and standard toolbar actions.                                  |
| 03      | [HTML](../example/03_ajax_objects/example3.html) · [JavaScript](../example/03_ajax_objects/example3.js)                     | `ajax.dataSrc`, `rowId`, and add, edit, and delete callbacks.                                      |
| 04      | [HTML](../example/04_more/DataTableExample.html) (includes JavaScript)                                                      | Hidden and readonly fields, select options, unique values, and input patterns.                     |
| 05      | [HTML](../example/05_two_datatables/example5.html) · [JavaScript](../example/05_two_datatables/example5.js)                 | Separate table instances, callbacks, and prefixed row identifiers.                                 |
| 06      | [HTML](../example/06_select_datepicker/example6.html) · [JavaScript](../example/06_select_datepicker/example6.js)           | `select2`, `multiple`, `datetimepicker`, display renderers, and `degree.id`.                       |
| 07      | [HTML](../example/07_dependent_select/example7.html) · [JavaScript](../example/07_dependent_select/example7.js)             | Country change handling, loading town options, request cancellation, and validation while loading. |
| 08      | [HTML](../example/08_validation/example8.html) · [JavaScript](../example/08_validation/example8.js)                         | `required`, `unique`, `uniqueMsg`, and salary formatting constraints.                              |
| 09      | [HTML](../example/09_translations/example9.html) · [JavaScript](../example/09_translations/example9.js)                     | `language.altEditorUrl` for editor translation loading.                                            |
| 10      | [HTML](../example/10_file_upload/example10.html) · [JavaScript](../example/10_file_upload/example10.js)                     | `type: file`, `maxFileSize`, download rendering, and preserving existing attachments.              |
| 11      | [HTML](../example/11_foundation/example11.html) · [JavaScript](../example/11_foundation/example11.js)                       | Foundation Reveal dependencies with the same public editor configuration.                          |
| 12      | [HTML](../example/12_custom_action_buttons/example12.html) · [JavaScript](../example/12_custom_action_buttons/example12.js) | `openAddDialog`, `openEditDialog`, and `openDeleteDialog`, including Responsive child rows.        |
| 13      | [HTML](../example/13_inline_edit/example13.html) · [JavaScript](../example/13_inline_edit/example13.js)                     | `inlineEdit`, save callbacks, lifecycle events, and numeric array sources.                         |
| 14      | [HTML](../example/14_rendered_controls/example14.html) · [JavaScript](../example/14_rendered_controls/example14.js)         | Display renderers, delegated handlers, control detection, and explicit inline exclusions.          |
| 15      | [HTML](../example/15_bulk_delete/example15.html) · [JavaScript](../example/15_bulk_delete/example15.js)                     | Multiple-row deletion.                                                                             |
| 16      | [HTML](../example/16_server_files/example16.html) · [JavaScript](../example/16_server_files/example16.js)                   | Server persistence and files.                                                                      |
| 17      | [HTML](../example/17_inline_options/example17.html) · [JavaScript](../example/17_inline_options/example17.js)               | Advanced inline editing.                                                                           |

## Adapt an example to your application

1. Copy the relevant HTML dependencies and table configuration. Update relative paths for the AltEditor distribution and any JSON or translation files. Most dialog examples use Bootstrap 5; Example 11 uses Foundation. Load one dialog framework and the optional controls required by your form.
2. Replace sample rows and column definitions together. Keep raw select values separate from their displayed labels. In Example 06, position and degree store option keys, friends stores an array of keys, and date values use the formats configured on the pickers. Renderers turn stored values into table text.
3. Replace simulated persistence with your backend calls. Call success only after the server accepts the operation, and call error when it fails. Return a complete persisted row when passing a replacement to success. Do not pass the static acknowledgement JSON as a replacement row. Preserve stable identifiers when editing; let the server assign new identifiers.
4. Keep feature-specific behavior that matters to your form. Example 07 prevents saving incomplete town options; Example 10 retains a file when no replacement is selected; Example 12 resolves actions in mobile child rows. For inline editing, follow the [supported controls and save behavior](inline-edit.md).
5. Style your application's table and page independently. The shared examples.css and theme.js files provide demonstration layout and the Appearance selector; they are not required by AltEditor. See [styling and themes](styling.md) for the editor's stylesheet and customization options.

Example 09 translates editor messages into Italian. To use another included language, change the translation file URL using the [language list](translations.md). DataTables toolbar text, table messages, and browser-native validation have separate localization settings.

The live site follows the deployed default branch. For changes available only in your checkout, run the local examples and read the matching local source. The online guide links from example pages describe the develop branch.

# Examples

[Documentation](README.md) · [Project overview](../README.md)

Browse the [live example directory](https://bensitu.github.io/DataTable-AltEditor/) without installing anything. Source files are available in [example/](../example/).

To run locally, install development dependencies with `npm ci`, then run `npm run dev` and open the [example directory](http://127.0.0.1:8080/). Serve the pages over HTTP rather than opening HTML files directly. The examples require access to their CDN dependencies.

All changes are temporary. In-memory examples reset on page reload. Ajax examples load static JSON and acknowledge writes without a persistent backend; their Refresh buttons restore the original rows. Newly added records receive a generated identifier within their table.

Ajax examples configure stable DataTables row identifiers so updates can find the same record after a reload. The multiple-table example prefixes identifiers to keep DOM IDs distinct. Client-generated identifiers and GET requests to static response files are demonstration techniques. Production applications should assign identifiers on the server, use appropriate write methods, and validate and authorize every operation.

Simulated save requests do not send row values in query strings. They call `success()` to accept the entered values locally after the static request completes. For a real persistence callback, see the PATCH example in the [API reference](api.md#persistence-callbacks).

CDN resources are convenient for these examples. For production deployments, manage dependencies locally or pin resources with matching Subresource Integrity metadata and a suitable Content Security Policy.

| Example                                                                                                             | What to try                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01: Arrays](https://bensitu.github.io/DataTable-AltEditor/example/01_in_memory_arrays/example1.html)               | Add, edit, and delete array rows; edit multiline text in the Position field.                                                                                                                                    |
| [02: Objects](https://bensitu.github.io/DataTable-AltEditor/example/02_in_memory_objects/example2.html)             | Edit named object fields and add a record with a generated identifier.                                                                                                                                          |
| [03: Ajax](https://bensitu.github.io/DataTable-AltEditor/example/03_ajax_objects/example3.html)                     | Save a change, see the submitted values in the table, then use Refresh to restore the static data.                                                                                                              |
| [04: Field options](https://bensitu.github.io/DataTable-AltEditor/example/04_more/DataTableExample.html)            | Change the on/off selection, enter a unique IPv4 address, and enter a single port from 0 to 65535. The read-only field remains unchanged. Port ranges are not part of this example.                             |
| [05: Multiple tables](https://bensitu.github.io/DataTable-AltEditor/example/05_two_datatables/example5.html)        | Edit either table and verify the other table retains its data. Each table has its own actions and generated identifiers.                                                                                        |
| [06: Select2 and dates](https://bensitu.github.io/DataTable-AltEditor/example/06_select_datepicker/example6.html)   | Change the position, multiple friends, date, timestamp, and degree. Save and reopen the row to see the retained values.                                                                                         |
| [07: Dependent fields](https://bensitu.github.io/DataTable-AltEditor/example/07_dependent_select/example7.html)     | Choose Italy or France and then a town from the loaded options. Germany hides and clears the town field. Failed option requests prevent saving until the country is changed and the options load successfully.  |
| [08: Validation](https://bensitu.github.io/DataTable-AltEditor/example/08_validation/example8.html)                 | Try an empty required name, a duplicate name or number, and a duplicate selection. Options 7 and 8 are initially unused. Salaries use grouped dollar notation such as `$1,000` or `$1,200,000`.                 |
| [09: Translations](https://bensitu.github.io/DataTable-AltEditor/example/09_translations/example9.html)             | Open the add, edit, and delete dialogs to see Italian labels loaded from the translation file.                                                                                                                  |
| [10: Files](https://bensitu.github.io/DataTable-AltEditor/example/10_file_upload/example10.html)                    | Attach a small file, save, and download its contents from the table. A later edit without a new file retains the attachment. Files are read as data URLs in browser memory; no file upload service is provided. |
| [11: Foundation](https://bensitu.github.io/DataTable-AltEditor/example/11_foundation/example11.html)                | Add, edit, and delete rows through Foundation Reveal dialogs.                                                                                                                                                   |
| [12: Custom actions](https://bensitu.github.io/DataTable-AltEditor/example/12_custom_action_buttons/example12.html) | Use Add record, click a row to edit, or choose its Delete action. On small screens, expand the row to access hidden columns and actions.                                                                        |
| [13: Cell editing](https://bensitu.github.io/DataTable-AltEditor/example/13_inline_edit/example13.html)             | Double-click a cell, save with Enter, cancel with Escape, or save and move with Tab. Enable Fail the next save to try error handling and retry. The second table demonstrates numeric array sources.            |

The Appearance selector supports system, light, and dark modes. See [styling and themes](styling.md) for application customization.

The file example limits each attachment to 2 MiB through `maxFileSize`. This client-side check prevents unnecessary reads; an upload service must enforce its own limits.

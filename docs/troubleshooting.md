# Troubleshooting

[Documentation](README.md) · [Project overview](../README.md)

Reproduce the behavior in the closest [example](examples.md), then compare dependency versions and configuration. Use a local HTTP server rather than opening the HTML directly from disk.

| Symptom                                  | What to check                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The editor is unavailable                | Load jQuery and DataTables before the AltEditor distribution. Use DataTables 2.1 or newer within 2.x. Check the console for rejected configuration.                                      |
| A dialog does not open                   | Load Bootstrap Modal or Foundation Reveal JavaScript. Without Select, provide an explicit row selector; edit needs exactly one row.                                                      |
| A field is missing                       | Give it a nonempty title and a supported data source. Dialogs exclude radio controls, complex paths, and `editable: false` fields. See [column options](api.md#column-options).          |
| Values disappear after a reload          | Without a real persistence endpoint, edits only change the loaded table. Static Ajax examples intentionally restore their source JSON on Refresh.                                        |
| Saving reports an unavailable target     | Configure a unique, stable `rowId` before editing. Replacing row objects during a save can otherwise make the original row unidentifiable.                                               |
| Native date/time inputs are empty        | Supply native HTML values such as `2026-09-13`, `14:30`, or `2026-09-13T14:30`. Display renderers do not change raw editing values.                                                      |
| A saved value is not accepted            | Call the supplied `success()` or `error()` callback once. Add/edit success accepts a row object or array, not an envelope such as `{ data: row }` unless your callback extracts the row. |
| Dark mode or control spacing looks wrong | Load the editor CSS after the framework and plugin CSS, and application overrides last. Check [theme attributes and variables](styling.md). Avoid mixing multiple framework stylesheets. |
| Labels remain in English                 | Check the translation URL and JSON structure. Loading is asynchronous; invalid files retain existing labels and emit an error. Native validation messages use the browser's language.    |
| A file cannot be saved                   | Check `maxFileSize` in bytes. For separate uploads, use `encodeFiles: false` and handle the File in your callback. Server limits still apply.                                            |
| `npm ci --engine-strict` fails           | Use a Node.js version permitted by `package.json`. Development dependencies have their own engine requirements; use the committed lockfile.                                              |

When reporting a bug, provide AltEditor, DataTables, jQuery, framework, and browser versions, reproduction steps, and the expected and actual results. Include relevant console or network errors without credentials or personal data. The [bug report form](https://github.com/bensitu/DataTable-AltEditor/issues/new?template=bug_report.yml) collects this information.

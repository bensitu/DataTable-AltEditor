# Architecture

[Documentation](README.md) · [Contributing](../CONTRIBUTING.md)

AltEditor attaches one editor instance to each DataTables table. Dialog editing and inline editing share data and configuration rules, while keeping their interaction state separate. Public methods remain on the editor instance; the source modules organize their implementation without adding runtime dependencies.

## Module responsibilities

| Location                                                                                                   | Responsibility                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [Entry point](../src/index.js) and [API registration](../src/core/api.js)                                  | Register the DataTables integration and expose the distribution entry point.                                                  |
| [Editor instance](../src/core/alt-editor.js)                                                               | Normalize configuration, attach resources, expose public methods, load translations, refresh data, and dispose the instance.  |
| [Options](../src/core/options.js), [columns](../src/core/columns.js), and [events](../src/core/events.js)  | Resolve settings and column metadata and emit the documented DataTables events.                                               |
| [Data utilities](../src/data/)                                                                             | Resolve row identity, update nested paths, normalize field values, and accept only the first persistence callback settlement. |
| [Dialog controller](../src/dialog/dialog.js)                                                               | Coordinate opening, selection, framework adapters, field initialization, submission binding, and dialog feedback.             |
| [Dialog view](../src/dialog/dialog-view.js) and [field renderer](../src/dialog/field-renderer.js)          | Construct the shared form and action buttons, then render the configured fields.                                              |
| [Form data](../src/dialog/form-data.js) and [persistence actions](../src/crud/actions.js)                  | Validate and collect submitted values, read attachments, invoke application persistence, and apply accepted changes.          |
| [Plugins](../src/dialog/plugins.js) and [framework adapters](../src/dialog/adapters/)                      | Initialize and release optional field controls and bridge Bootstrap, Foundation, or optional native dialog APIs.              |
| [Inline controller](../src/inline/inline-editor.js) and [native controls](../src/inline/inline-control.js) | Manage a cell editing session, keyboard interaction, candidate values, validation, and persistence.                           |
| [Styles](../src/style/dataTables.altEditor.css)                                                            | Style editor-owned elements with scoped selectors and customizable theme properties.                                          |

## Shared behavior and deliberate differences

Select option normalization and checkbox conversion live in data utilities so dialog, inline, and option-reloading behavior agree. Row snapshots and nested path updates also use shared utilities. Keep these rules in one place when adding supported field formats.

Dialog and inline controllers remain separate because their lifetimes and submission contracts differ. Dialogs collect multiple fields, integrate optional plugins, and can read files. Inline editing uses a single native control, supports keyboard navigation, and submits a complete candidate row. Dialog values retain their existing input conversion behavior; inline number inputs return numbers. Do not merge these paths merely because they both render an input.

The shared dialog view owns the form identifier, footer buttons, and close attributes. Framework-specific APIs remain in adapters. Preserve existing public methods and compatibility aliases when moving implementation between modules; source modules are not a separate public extension API.

## Operation lifetime

Dialog submissions capture eligible field names before asynchronous collection and build their candidate before calling application persistence. Later changes to control values or disabled states do not alter an accepted submitted candidate. A persistence callback can return an explicit replacement row when server processing changes values.

Each dialog opening has an identity used to reject outdated completions. Inline editing tracks its active session. Controllers check that their operation is still valid after application events and redraws, since an event handler can destroy the editor or open another dialog. Completion of one dialog must not close a dialog opened by its success handler.

Destroying an editor prevents further persistence invocation after submission events and suppresses later refresh completion events. This does not undo an already dispatched server request or replace DataTables' ownership of Ajax loading. Application code remains responsible for server-side cancellation, authorization, and concurrent writes.

Rendered interactive content belongs to the application rather than to the inline controller. Keep detection and navigation decisions in the inline controller; use `inlineEditable: false` for custom widgets whose behavior is not represented by recognizable HTML. See [rendered controls](inline-edit.md#rendered-interactive-controls) and [Example 14](../example/14_rendered_controls/example14.js).

## Verification and distribution

Exercise shared field behavior through control tests, operation lifetime through persistence tests, and actual framework and keyboard behavior through browser tests. Prefer regression cases with observable user behavior over tests that enforce module names or source layout. See [verification commands](../CONTRIBUTING.md#verification).

Build from `src/` and commit the resulting JavaScript, CSS, minified files, and source maps in `dist/`. Examples load the distribution, so rebuild before checking them. No module restructuring should require applications to change their script loading order or DataTables configuration.

## Dialog presentation extensions

The [template module](../src/dialog/template.js) clones application layouts, validates field slots, remaps layout identifiers, and renders deletion details. It moves generated field nodes rather than duplicating field construction or data collection. New layouts therefore retain the same validation and persistence behavior.

Dialog configuration selects an existing framework adapter or explicitly opts into native dialogs. Adapter selection does not add runtime dependencies. The controller coordinates synchronous opening and render notifications and prevents recursive opening or replacement during closure. Bootstrap closing requests made during its show transition run after the shown event. Native mode delegates modal focus containment to the browser and retains the editor's save and cleanup contracts.

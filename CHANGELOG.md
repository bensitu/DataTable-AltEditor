# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-09-09

### Added

- Cell inline editing with native controls, immutable candidate rows, keyboard navigation, IME composition handling, validation, and persistence retry.
- onInlineEditRow callback with onEditRow fallback and structured DataTables lifecycle events.
- Public table.altEditor() accessor, editor.api(), dialog methods, inline methods, refresh(), and destroy().
- Reproducible readable and minified UMD builds, source maps, CSS, and exact dependency locking.
- DataTables 2.1.x and browser compatibility commands.

### Changed

- JavaScript source is organized into ES modules using DataTables 2.x public initialization and column APIs.
- Package version is 4.0.0; the package entry and example script paths now use dist/.
- Examples use DataTables 2.3.8, Buttons 3.2.6, Select 3.1.3, and Bootstrap 5, with a separate Foundation example.
- Bootstrap 5 uses its official Modal API. Bootstrap 4 and Foundation Reveal remain supported; Bootstrap 3 compatibility is best effort.
- Buttons and Select are optional for programmatic usage.
- Edit and delete targets retain their identity independently of changes in selection. Repeated callback settlements are ignored.

### Fixed

- Array fields with numeric source 0 and immutable nested row updates.
- uniqueMsg validation, safe option merging, text-only error rendering, file read failures, and optional plugin cleanup.
- Inactive dialogs remain hidden when using inline editing without a dialog framework.

### Deprecated

- _openAddModal, _openEditModal, and _openDeleteModal aliases; use the public dialog methods.
- The special column attribute; it remains readable for compatibility.

### Removed

- Unused alwaysAsk, focus, columns, update, and editor defaults.
- Direct script consumption of the single-file source. Use the built UMD distribution.

2021-04 thetechnician94
*Added more modifiers for number columns
*Checkboxes will now be checked when the value of a column is 1
*Dropdowns sometimes got extra spaces around their values, fixed
*Added the `value` modifier: lets you specify a value for the add dialog
*Disabled fields are no longer sent to the endpoint. HTTP POST never sends these, maintaining that convention

2020-09 luca-vercelli * basic support for Foundation * "close modal on success" feature

2020-09 viicslen * basic npm support

2020-06 mjbernot * support for checkboxes and date input fields * IE compatibility support

2020-04 luca-vercelli * support for file uploads

2020-02 goalgui10 * support for textareas

2019-07 luca-vercelli * better support for readonly and disabled fields, see issue #35

2019-11 seunets * i18n support

2019-05 luca-vercelli * better documentation * limited support for nested objects, see issue #15

2019-03 luca-vercelli * support for datepicker, datetimepicker, select2

2018-09 luca-vercelli * some improvements in AJAX callbacks

2018-07 zach-hable * Version 2.0 * Cleaner source code * Improved modal layouts * Input validation * Callbacks for use of AJAX when a row is added/edited/deleted * Support for Max length of items * Support for Multiple select box * Support for using Select2 Dropdowns

2017-07 luca-vercelli * Support for object-based data * Cleaner source code * Refresh button * Naive AJAX support

2016-09 KasperOlesen * Initial commit * Added example and tweaked comments in editor

2016-04 Kingcode * Original script found at http://kingkode.com/free-datatables-editor-alternative/ * It seems that, nowadays, the source code is changed there

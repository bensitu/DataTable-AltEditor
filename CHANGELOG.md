# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Starting with 4.0.0, version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html): incompatible public API changes increment the major version, compatible features increment the minor version, and compatible fixes increment the patch version.

## 4.0.0 - 2026-09-09

### Added

- Monthly Dependabot updates for npm development dependencies and GitHub Actions within their current major versions, preserving the DataTables 2.1.x compatibility dependency.
- Simplified Chinese, Japanese, Spanish, French, German, Korean, and Turkish translations, with a language configuration and coverage guide.
- Automatic light and dark editor themes, scoped CSS custom properties, and an Appearance selector shared by the examples.
- Security policy covering supported versions, private vulnerability reporting, and application responsibilities.
- Code of conduct covering participation standards, reporting concerns, and maintainer responses.
- Cell inline editing with native controls, immutable candidate rows, keyboard navigation, IME composition handling, validation, and persistence retry.
- onInlineEditRow callback with onEditRow fallback and structured DataTables lifecycle events.
- Public table.altEditor() accessor, editor.api(), dialog methods, inline methods, refresh(), and destroy().
- Reproducible readable and minified UMD builds, source maps, CSS, and exact dependency locking.
- DataTables 2.1.x and browser compatibility commands.

### Changed

- CI dependency installation enforces declared Node.js requirements on Node.js 24.
- Generated JavaScript, source maps, and CSS in `dist/` are tracked in Git and shipped with the checkout.
- Examples use consistent DataTables table styling without overlapping Bootstrap table classes.
- Example pages share responsive navigation, typography, table containers, and an example directory. Long dialog forms scroll within the available mobile viewport.
- Historical changelog entries are grouped by change type and listed in reverse chronological order, preserving available dates and contributor credits.
- JavaScript source is organized into ES modules using DataTables 2.x public initialization and column APIs.
- Package version is 4.0.0; the package entry and example script paths now use dist/.
- Examples use DataTables 2.3.8, Buttons 3.2.6, Select 3.1.3, and Bootstrap 5, with a separate Foundation example.
- Bootstrap 5 uses its official Modal API. Bootstrap 4 and Foundation Reveal remain supported; Bootstrap 3 compatibility is best effort.
- Buttons and Select are optional for programmatic usage.
- Edit and delete targets retain their identity independently of changes in selection. Repeated callback settlements are ignored.

### Fixed

- The dialog close button's accessible label updates when an asynchronous translation finishes loading.
- Missing Italian, Russian, and Ukrainian deletion confirmations, the Italian response code label, and Ukrainian spelling in the required-field message.
- Examples generate new row identifiers consistently and remove duplicate identifiers from sample data. Validation starts with valid unique values, field options use supported constraints, and custom actions work in responsive row details.
- Ajax examples retain submitted values and assign identifiers to new rows. Dependent town options handle loading, request failures, and country changes. The file example stores and downloads attachments without discarding them on later edits.
- Example 6 retains submitted selections and dates after simulated saves, derives degree labels from the selected value, and uses the source timestamp format in its date/time control.
- Dialog close button alignment, form spacing, checkbox sizing, and stacked fields on small screens across supported dialog frameworks.
- Array fields with numeric source 0 and immutable nested row updates.
- uniqueMsg validation, safe option merging, text-only error rendering, file read failures, and optional plugin cleanup.
- Inactive dialogs remain hidden when using inline editing without a dialog framework.

### Deprecated

- _openAddModal, _openEditModal, and _openDeleteModal aliases; use the public dialog methods.
- The special column attribute; it remains readable for compatibility.

### Removed

- Unused alwaysAsk, focus, columns, update, and editor defaults.
- Direct script consumption of the single-file source. Use the built UMD distribution.

## Historical changes

The original changelog recorded most updates by month without release versions or exact release dates. The entries below retain that precision and the original contributor credits; they are not a complete release history. The original version label `2.0` is preserved without inferring a patch version. Semantic Versioning compliance is not asserted for these historical entries.

### 2021-04

Contributor: thetechnician94.

#### Added

- Additional modifiers for number columns.
- The `value` modifier for specifying an initial value in the add dialog.

#### Changed

- Disabled fields are excluded from submitted data, consistent with native HTML form submission.

#### Fixed

- Checkboxes are checked when a column value is `1`.
- Unwanted spaces around dropdown values.

### 2020-09

Contributors: luca-vercelli, viicslen.

#### Added

- Basic Foundation support and an option to close the dialog after a successful operation (luca-vercelli).
- Basic npm support (viicslen).

### 2020-06

Contributor: mjbernot.

#### Added

- Checkbox and date input fields.
- Internet Explorer compatibility.

### 2020-04

Contributor: luca-vercelli.

#### Added

- File uploads.

### 2020-02

Contributor: goalgui10.

#### Added

- Textarea fields.

### 2019-11

Contributor: seunets.

#### Added

- Internationalization support.

### 2019-07

Contributor: luca-vercelli.

#### Changed

- Improved handling of read-only and disabled fields ([#35](https://github.com/KasperOlesen/DataTable-AltEditor/issues/35)).

### 2019-05

Contributor: luca-vercelli.

#### Added

- Limited nested object support ([#15](https://github.com/KasperOlesen/DataTable-AltEditor/issues/15)).

#### Changed

- Improved documentation.

### 2019-03

Contributor: luca-vercelli.

#### Added

- Datepicker, datetimepicker, and Select2 integration.

### 2018-09

Contributor: luca-vercelli.

#### Changed

- Improved AJAX callbacks.

### 2.0 - 2018-07

Contributor: zach-hable.

#### Added

- Input validation and maximum input length support.
- AJAX callbacks for adding, editing, and deleting rows.
- Multiple-selection fields and Select2 dropdown integration.

#### Changed

- Simplified source code and improved dialog layouts.

### 2017-07

Contributor: luca-vercelli.

#### Added

- Object-based row data.
- Refresh button.
- Basic AJAX support.

#### Changed

- Simplified source code.

### 2016-09

Contributor: KasperOlesen.

#### Added

- Initial repository implementation and example.

#### Changed

- Updated editor comments.

### 2016-04

Contributor: Kingcode.

#### Added

- Original script, historically published at `http://kingkode.com/free-datatables-editor-alternative/`. The historical changelog notes that the content at that address subsequently changed.

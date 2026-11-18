# Styling and themes

[Documentation](README.md) · [Project overview](../README.md)

`npm run build` produces the readable `dist/dataTables.altEditor.css`, the compressed `dist/dataTables.altEditor.min.css`, and its external `dist/dataTables.altEditor.min.css.map`. Load either CSS version, not both. The compressed stylesheet references its map, which includes the original CSS content for browser debugging without requiring the source directory to be deployed. Keep the map beside the compressed stylesheet when publishing it. Both CSS versions preserve the license notice and are included in the npm package.

The package `style` entry points to `dist/dataTables.altEditor.min.css` for tools that resolve stylesheet entries. The `unpkg` and `jsdelivr` entries select the default JavaScript file; they do not exclude CSS files from the archive. Loading JavaScript does not automatically load CSS: include a stylesheet link or an explicit CSS import in your application.

Load `dist/dataTables.altEditor.css` after your dialog framework's CSS and optional control stylesheets. Load application overrides last. AltEditor rules target its own dialog, inline control, and date picker classes; they do not style `body`, ordinary tables, unrelated forms, or other dialogs. The distribution stylesheet has no `!important` declarations.

Errors shown outside an open dialog use an editor-owned `.altEditor-message` container immediately before the table. Override that selector to customize their spacing and presentation.

## Color modes

AltEditor follows the system color preference by default. To choose a mode explicitly, set `data-alteditor-theme="light"` or `data-alteditor-theme="dark"` on the document element. Bootstrap's `data-bs-theme` attribute on an ancestor is also supported. Use one convention consistently; remove the explicit attribute to follow the system again.

```html
<html lang="en" data-alteditor-theme="dark"></html>
```

Themes use native `color-scheme` and CSS `light-dark()` when available. A static palette follows the system preference and the same theme attributes when `light-dark()` is unavailable. Native input appearance can vary by browser. AltEditor also styles its Select2 controls and its jquery-datetimepicker popups. Other optional plugins may require their own theme stylesheets.

The default Select2 theme reserves extra room for clear buttons in browsers without `:has()`. Applications can still override the styles at the same specificity.

Setting a theme does not change application-wide colors. Applications should theme their own tables, page backgrounds, and other components separately.

Foundation Reveal dialogs use the same `--alteditor-surface` and `--alteditor-border` values for their outer container as for the editor content. These rules apply only to AltEditor dialogs inside the Reveal overlay.

## Custom properties

Set the following properties on `html` or `body` for all editors, or on an individual editor element for a local override. Defaults adapt to light and dark modes unless a single color is listed.

| Property                         | Purpose                                                               |
| -------------------------------- | --------------------------------------------------------------------- |
| `--alteditor-surface`            | Dialog and date picker background.                                    |
| `--alteditor-text`               | Editor text color.                                                    |
| `--alteditor-placeholder`        | Input and Select2 placeholder text color.                             |
| `--alteditor-control-background` | Input, Select2, and inline control background.                        |
| `--alteditor-border`             | Control and dialog separator borders.                                 |
| `--alteditor-hover`              | Disabled controls, selection chips, and hover backgrounds.            |
| `--alteditor-accent`             | Focus outlines and active control borders.                            |
| `--alteditor-error`              | Dialog and inline field messages and invalid control borders.         |
| `--alteditor-action-background`  | Primary action and selected option background; defaults to `#2458b8`. |
| `--alteditor-action-text`        | Primary action and selected option text; defaults to `#fff`.          |
| `--alteditor-radius`             | Control and close button corner radius; defaults to `0.375rem`.       |
| `--alteditor-spacing`            | Header gap and vertical field spacing; defaults to `1rem`.            |
| `--alteditor-check-size`         | Dialog checkbox and radio size; defaults to `1.25rem`.                |

```css
html {
  --alteditor-surface: light-dark(#ffffff, #15251e);
  --alteditor-text: light-dark(#173a2a, #e0f2e8);
  --alteditor-accent: light-dark(#157347, #75d7a6);
  --alteditor-action-background: #157347;
  --alteditor-radius: 0.5rem;
  --alteditor-spacing: 1.25rem;
}
```

Dialogs are appended to `body`, so variables on a table wrapper do not reach its dialog. Use document-level variables to include popups rendered outside the dialog as well. For a specific dialog, use the `alteditor-open.dt` event to add a class to the dialog or apply variables directly to its `.altEditor-modal` element. Native inline controls inherit variables from their table cells.

For changes beyond the listed properties, use scoped selectors in your application stylesheet:

```css
.altEditor-modal .altEditor-title {
  font-size: 1.25rem;
}

.altEditor-modal .altEditor-input :is(.form-control, .altEditor-control) {
  min-height: 2.75rem;
}

.alteditor-inline-control {
  padding: 0.375rem;
}
```

Keep custom controls, text, focus indicators, and error messages legible in both color modes.

Dialog inputs share font, line height, and padding across adapters. AltEditor styles the default Select2 theme inside its dialogs. Multiple selections wrap within the control, and their inline search field inherits the dialog font. Placeholder colors follow the active theme and can be overridden with `--alteditor-placeholder`. A different Select2 theme configured through `select2.theme` supplies its own styles.

Load Select2 CSS first, followed by AltEditor CSS and any application overrides. To override a default style, scope the application selector to the dialog with `:where(.altEditor-modal)` and match the relevant Select2 classes. For example, `:where(.altEditor-modal) .select2-container--default .select2-selection--multiple .select2-selection__choice` can change the gap between a label and its remove button.

The default Select2 theme has been verified with versions 4.0.7, 4.0.13, and 4.1.0. Use matching Select2 JavaScript and CSS versions. When a dropdown is open, Tab selects the highlighted option in 4.1.0, while 4.0.7 and 4.0.13 leave the selection unchanged.

## Custom layouts and native dialogs

[Dialog templates](dialogs.md) arrange generated fields within application-owned markup. Scope custom CSS to a class in the template. Shared shell classes (`.altEditor-header`, `.altEditor-title`, `.altEditor-body`, `.altEditor-footer`, and `.altEditor-content`) are available with every adapter. Legacy Bootstrap classes remain on Bootstrap dialogs.

Explicit native mode uses `.altEditor-native`, `.altEditor-control`, and `.altEditor-button` without Bootstrap or Foundation component classes. It shares the existing theme variables; `--alteditor-backdrop` additionally sets its backdrop color (default `rgb(0 0 0 / 50%)`). The native adapter is optional and does not alter the default dialog browser requirements.

Template field slots receive `--alteditor-spacing` between adjacent fields by default. Application layout rules can override this low-specificity spacing. Native dialogs constrain long forms to the viewport and scroll the body while retaining visible header and footer actions.

## Browser compatibility

With Bootstrap and DataTables `>=2.1.0 <3`, the baseline for basic row creation, editing, deletion, validation, keyboard use, and attachments is Chrome or Chromium Edge 88+, Firefox 85+, Safari 14.1+, or Safari on iOS 14.5+. The stylesheet uses `:is()`, `:where()`, and Flexbox gap. Colors, spacing, and native controls can vary slightly by browser. Internet Explorer is unsupported.

Compatibility checks used Chromium 88, a Firefox 85 beta, and Playwright WebKit 14.1 with DataTables 2.1.0 and 2.3.8. Validate the actual Safari or WebView environment for applications that depend on it.

Use the Bootstrap adapter on browsers without `HTMLDialogElement.showModal()`. Native mode, other dialog frameworks, optional plugins, and example backends may have additional requirements. See [dialog configuration](dialogs.md#framework-selection-and-browser-compatibility).

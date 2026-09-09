# Styling and themes

Load `dist/dataTables.altEditor.css` after your dialog framework's CSS and optional control stylesheets. Load application overrides last. AltEditor rules target its own dialog, inline control, and date picker classes; they do not style `body`, ordinary tables, unrelated forms, or other dialogs. The distribution stylesheet has no `!important` declarations.

## Color modes

AltEditor follows the system color preference by default. To choose a mode explicitly, set `data-alteditor-theme="light"` or `data-alteditor-theme="dark"` on the document element. Bootstrap's `data-bs-theme` attribute on an ancestor is also supported. Use one convention consistently; remove the explicit attribute to follow the system again.

```html
<html lang="en" data-alteditor-theme="dark"></html>
```

Themes use native `color-scheme` and CSS `light-dark()`, supported by current Chrome, Edge, Firefox, and Safari. Native input controls follow the selected color mode. AltEditor also styles its Select2 controls and its jquery-datetimepicker popups. Other optional plugins may require their own theme stylesheets.

Setting a theme does not change application-wide colors. Applications should theme their own tables, page backgrounds, and other components separately.

## Custom properties

Set the following properties on `html` or `body` for all editors, or on an individual editor element for a local override. Defaults adapt to light and dark modes unless a single color is listed.

| Property                         | Purpose                                                               |
| -------------------------------- | --------------------------------------------------------------------- |
| `--alteditor-surface`            | Dialog and date picker background.                                    |
| `--alteditor-text`               | Editor text color.                                                    |
| `--alteditor-control-background` | Input, Select2, and inline control background.                        |
| `--alteditor-border`             | Control and dialog separator borders.                                 |
| `--alteditor-hover`              | Disabled controls, selection chips, and hover backgrounds.            |
| `--alteditor-accent`             | Focus outlines and active control borders.                            |
| `--alteditor-error`              | Inline validation messages and invalid control outlines.              |
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
.altEditor-modal .modal-title {
  font-size: 1.25rem;
}

.altEditor-modal .altEditor-input .form-control {
  min-height: 2.75rem;
}

.alteditor-inline-control {
  padding: 0.375rem;
}
```

Keep custom controls, text, focus indicators, and error messages legible in both color modes.

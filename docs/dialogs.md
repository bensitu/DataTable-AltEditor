# Dialog templates and presentation

[Documentation](README.md) · [Examples](examples.md) · [Events](events.md)

Available since 4.1.0. Configure `altEditor.dialog` to arrange generated fields, customize deletion details, and choose the dialog framework. Existing configurations continue to use the generated layout and automatic Bootstrap / Foundation selection.

## Independent add and edit layouts

```html
<template id="add-person">
  <fieldset>
    <legend>New person</legend>
    <div data-alteditor-field="name"></div>
    <div data-alteditor-field="email"></div>
  </fieldset>
</template>
<template id="edit-person">
  <section>
    <h2>Contact details</h2>
    <div data-alteditor-field="email"></div>
    <div data-alteditor-field="name"></div>
  </section>
</template>
```

```js
const table = new DataTable('#people', {
  data: [{ name: 'Alice', email: 'alice@example.com' }],
  columns: [
    { data: 'name', title: 'Name', required: true },
    { data: 'email', title: 'Email', type: 'email' },
  ],
  altEditor: {
    dialog: {
      templates: { add: '#add-person', edit: '#edit-person' },
    },
  },
});
```

Load a supported dialog framework for this example. [Example 18](../example/18_dialog_templates/example18.html) includes a complete Bootstrap page, distinct layouts, selection, and deletion summaries.

Each template accepts a CSS selector, an element, a `DocumentFragment`, or a synchronous function returning one of these. A function receives `{ editor, action, mode, rows }`; `action` is `add` or `edit`, `mode` is `dialog`, and `rows` contains detached copies of the selected data (empty for add). Return `null` or `undefined` to use the generated layout. For example:

```js
const templates = {
  add: '#add-person',
  edit: ({ rows }) => (rows[0].email ? '#edit-person' : '#add-person'),
};
```

The library clones the layout on each opening. It does not move or change the original template. DOM listeners attached directly to source elements are not cloned; initialize custom interactions with `onRender` and release external resources with `onClose` or the editor destroy event.

Every generated non-hidden field needs exactly one `data-alteditor-field` slot whose value matches its column data path or numeric array index. This includes fields with `visible: false`; their generated visibility is preserved. Hidden inputs are retained automatically without slots. Columns that do not generate controls, including `editable: false`, must not have slots. Missing, duplicate, nested, and unknown slots reject opening and emit `alteditor-error.dt` with `action: 'open'`. Templates must not contain additional forms, inputs, selects, textareas, or editable content; use column options for controls. Extra layout buttons must use `type="button"`.

Template IDs receive an instance-specific prefix. Internal `for`, `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-owns`, and fragment `href` references follow those IDs. Use application classes and data attributes for CSS and queries instead of fixed cloned IDs. Duplicate IDs inside a template are rejected. Field controls keep the existing field identifier contract.

The editor owns labels, generated controls, validation, default values, plugins, form submission, and footer actions. Templates change the body layout; they do not replace the dialog shell. Use language settings for titles and button captions, scoped CSS for appearance, and `onRender` for additional DOM presentation. Keep all generated fields within their form and preserve readable labels and keyboard order.

## Deletion details

`deleteDetails` defaults to `false`, preserving the confirmation message without row details. A synchronous callback can return text or a newly created DOM element / fragment. It receives the same context, with `action: 'delete'` and one or more detached selected rows.

```js
const dialog = {
  deleteDetails({ rows }) {
    return rows.map((row) => row.name).join(', ');
  },
};
```

For richer content, build a list using `document.createElement` and set row values through `textContent`. String results are always text, never HTML. DOM results are mounted directly so their listeners work; return disposable nodes, not elements already displayed elsewhere. Return `false`, `null`, or `undefined` to omit details for a particular opening. The translated confirmation question and Delete / Close actions remain present.

Selected identities are captured before opening callbacks. After those callbacks, the editor resolves the same records and reads their current values. If a target has disappeared, opening is rejected. A later table selection does not change deletion targets. Presentation callbacks must not mutate table data; changing their detached row copies does not update the records. Persistence still uses the existing [deletion callback](api.md#persistence-callbacks) and row identity checks.

## Framework selection and browser compatibility

| `dialog.framework` | Behavior                                                                             |
| ------------------ | ------------------------------------------------------------------------------------ |
| `auto` (default)   | Use available Bootstrap Modal first, otherwise Foundation Reveal.                    |
| `bootstrap`        | Require Bootstrap Modal; do not select Foundation.                                   |
| `foundation`       | Require Foundation Reveal; remove Bootstrap component classes from the owned dialog. |
| `native`           | Explicitly opt into the browser's modal `<dialog>` without Bootstrap or Foundation.  |

Select a framework when both are loaded. The library only changes its own dialog, fields, and actions; it does not change framework plugins, unrelated dialogs, or global styles. Application-wide CSS rules can still affect ordinary HTML elements. Scope custom layout styles to your application class and load the editor stylesheet after framework styles.

The supported DataTables range remains `>=2.1.0 <3`. [DataTables 2 browser support](https://datatables.net/download/compatibility) targets modern browsers and excludes Internet Explorer. No native dialog support is required by the default Bootstrap / Foundation path. Native mode checks `HTMLDialogElement.showModal` and reports an opening error if unavailable; it does not silently choose another framework. The standard API is [widely supported](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal), including Firefox 98+ and Safari 15.4+. Applications requiring older browser versions should retain their supported framework adapter.

[Example 19](../example/19_native_dialog/example19.html) demonstrates explicit native mode with feature detection and no Bootstrap or Foundation assets. It includes native input types, Select2 multiple selection, DataTables Select, a custom template, and custom cell display renderers. The save callbacks explicitly convert the numeric field to a number; checkbox values and multiple selections retain booleans and arrays. The browser owns focus containment and background inertness. Close buttons cancel the dialog; Escape and backdrop dismissal remain disabled, matching the existing editor behavior. Successful saves follow `closeModalOnSuccess`. Pending saves disable close and submit buttons.

Native dialogs use the browser top layer. Third-party popup controls must support rendering their popup inside the dialog; a popup appended to `document.body` can appear behind it. AltEditor sets Select2's `dropdownParent` to its dialog, as demonstrated in Example 19. Use Bootstrap / Foundation for other integrations that cannot configure a popup container. Templates on those existing adapters preserve their current plugin integration behavior.

## Lifecycle callbacks

All callbacks are synchronous and are configured inside `altEditor.dialog`.

| Callback                | Timing and payload                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `onBeforeOpen(context)` | After selection validation and before layout rendering. Return `false` to cancel.                    |
| `onRender(context)`     | Once controls, values, plugins, and submit binding are ready. Adds DOM `dialog` and `form` elements. |
| `onClose(context)`      | After dialog closure and editor cleanup.                                                             |

The common context contains `editor`, `action`, `mode`, and detached `rows`. Matching events are `alteditor-before-open.dt`, `alteditor-dialog-render.dt`, and `alteditor-close.dt`; they run before their corresponding callback. `preventDefault()` on before-open also cancels opening. Render and close are notifications, so returning `false` does not undo them. `alteditor-open.dt` follows render notification. Framework show transitions may still be running; use framework shown events for operations requiring a completed transition.

```js
const dialog = {
  onBeforeOpen({ action }) {
    return action !== 'add' || canCreateRecords;
  },
  onRender({ form }) {
    form.querySelector('[name="email"]')?.setAttribute('autocomplete', 'email');
  },
  onClose({ action }) {
    console.log('Closed dialog:', action);
  },
};
```

The application supplies `canCreateRecords`; client checks do not replace server authorization. Do not return promises from these callbacks or template resolvers. Use the existing asynchronous persistence callbacks for network writes. Exceptions from opening configuration or callbacks are reported through the editor error event. A rejected layout can be corrected and opened again. Opening during a close transition is rejected; wait for `alteditor-close.dt` before opening another dialog. Recursive opening from before-open or render callbacks is ignored, and destroying the editor prevents further opening work.

## Styling and trusted content

Use an application class inside the template and standard CSS layout rules. The [styling guide](styling.md) documents shared `--alteditor-*` properties. The shell also exposes `.altEditor-title`, `.altEditor-header`, `.altEditor-body`, `.altEditor-footer`, and `.altEditor-content` across adapters. Native controls use `.altEditor-control` and native action buttons use `.altEditor-button`.

Templates and returned DOM are trusted application configuration; the library does not sanitize them. Do not interpolate untrusted values into markup or HTML strings. Use `textContent` for row data and sanitize external HTML before creating a template. Deletion strings are safely inserted as text.

Generated field identifiers are unique to each editor instance. Locate controls by their `name` inside the supplied `form` or dialog element; do not assume that a field name is its DOM identifier. Labels remain associated with their corresponding controls.

If a field plugin or `editorOnChange` callback throws during initialization, opening returns `false`, closes the incomplete dialog, and reports `alteditor-error.dt` with `action: 'open'`. Correct the configuration and wait for any framework closing transition before retrying. A failed opening does not emit the ready or normal close callbacks.

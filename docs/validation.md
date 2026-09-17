# Persistence and field validation

[Documentation](README.md) · [Configuration and API](api.md) · [Example 21](../example/21_async_validation/example21.html)

## Promise persistence

Existing callback arguments and callback-only implementations remain supported. A persistence callback may also return a Promise or thenable. Resolution accepts a row; rejection reports a failure. This applies to add, edit, delete, and inline editing.

```js
altEditor: {
  async onEditRow(editor, values, success, error, originalRowData) {
    const response = await fetch('/api/contacts/' + encodeURIComponent(originalRowData.id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    if (!response.ok) throw await response.json();
    return await response.json();
  }
}
```

Return the complete saved row when the server changes its values. Resolving `undefined` has the same meaning as `success()`: add and inline editing accept the submitted candidate, dialog editing merges the submitted fields with the original row, and deletion removes its captured targets. Delete ignores the resolved value. A normal non-thenable return value does not settle persistence; callback-only code can return a request identifier without changing behavior.

The first settlement wins, whether it comes from `success`, `error`, a returned thenable, or a synchronous throw. For example, calling `success(row)` and then returning a rejected Promise still accepts that first row, consumes the rejection, and produces no second update or event. Choose one persistence style per callback for clarity. A synchronous throw before settlement is a failure.

The editor blocks repeated submissions while work is pending. Standard close actions and operation replacement remain disabled during validation and persistence. If the framework closes the dialog externally or the editor is destroyed, later results are ignored. Missing edit or delete targets cannot redirect changes to another row. These protections do not cancel network requests; configure transport timeouts and server concurrency handling in the application.

## Structured errors

Pass this object to `error()` or reject with it:

```js
{
  message: 'Please correct the highlighted fields.',
  fieldErrors: {
    email: 'This email is already registered.',
    'profile.code': 'This code is not available.'
  }
}
```

`message` is optional. `fieldErrors` maps column data paths to nonempty message strings, including numeric array keys and dotted object paths. Strings, `Error` instances, and objects containing only `message` remain valid global failures. Existing Ajax response error formats remain supported. All feedback renders as text.

Dialog errors appear beside editable visible controls. Existing `aria-describedby` values are preserved, and invalid controls receive `aria-invalid="true"`. The first available invalid control receives focus. Select2 feedback also describes its visible selection control. An error for a hidden, disabled, readonly, omitted, or unknown field appears in global feedback instead. Template layouts retain the same rules; generated fields use their names rather than CSS selectors derived from server keys.

An `input` or `change` event clears only that field's error and restores its previous accessibility attributes. Dialog close, replacement, rerendering, and a new submission clear previous field errors. Global messages remain available until replaced by subsequent feedback or a new operation. Inline failures keep the current control editable; errors for unrelated fields also appear above the table.

## Custom validators

Add `editorValidate` to a DataTables column definition. Keep native constraints such as `required`, `pattern`, `min`, `max`, `step`, and `maxLength` for ordinary input validation.

```js
{
  data: 'email',
  title: 'Email',
  type: 'email',
  required: true,
  editorValidate(value, context) {
    if (!value.endsWith('@example.com')) {
      return 'Use an @example.com email address.';
    }
    if (context.values.username === value) {
      return 'Choose a username different from the email.';
    }
  }
}
```

An asynchronous check uses the same option:

```js
{
  data: 'username',
  title: 'Username',
  async editorValidate(value) {
    const response = await fetch('/api/available?name=' + encodeURIComponent(value));
    if (!response.ok) throw new Error('Unable to check this username.');
    const result = await response.json();
    if (!result.available) return 'This username is already in use.';
  }
}
```

| Result                         | Meaning                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `true`, `undefined`, or `null` | Valid.                                                            |
| Nonempty string                | Invalid, with that field message.                                 |
| `false` or an empty string     | Invalid, with `language.altEditor.error.validation`.              |
| Promise/thenable               | Wait and interpret its resolved result using these same rules.    |
| Throw or rejection             | Validator execution failed; show global feedback and allow retry. |

Other return types produce a global configuration error. Validation failures are expected results; reserve throws and rejections for execution failures such as unavailable services.

The context contains `editor`, `field` (the column data source), `values`, `originalRowData`, and `operation` (`add`, `edit`, or `inline-edit`). `originalRowData` is null for add. `values` contains collected dialog values or the complete inline candidate row. Plain objects and arrays are copied for each validator, so changing them does not change submitted data or another validator's view. Treat all context data as read-only, including file objects and other retained non-plain values. The field value uses the same conversion as persistence; see [value conversion](api.md#column-options).

For dialogs, collection runs first, then native constraints, then custom validators. Each eligible custom validator runs once per submission; asynchronous checks can run concurrently and feedback follows column order. Persistence and pre-submit/submit events run only after all validation passes. Native constraints use the browser's `checkValidity()` and messages; the editor displays feedback rather than relying on the browser's automatic form submission popup.

Custom validation runs only for editable, enabled, visible controls in the current form. Hidden, readonly, disabled, omitted, and `editable: false` fields are skipped. Select2's hidden source select remains eligible through its visible replacement. Native validation retains the controls' own browser rules. Delete does not run field validators. Inline editing validates only its active field, with the complete candidate available for cross-field checks.

Validators do not run on each keystroke. Correct a value and submit again to retry. Stale results after closure or destruction cannot update another operation, and validation cannot start a second persistence request while one is active. These client checks improve feedback; the server must still validate and authorize submitted data.

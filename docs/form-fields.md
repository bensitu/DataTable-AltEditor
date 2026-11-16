# Form fields and value conversion

[Documentation](README.md) · [Configuration and API](api.md) · [Example 22](../example/22_form_fields/example22.html)

## Independent fields

Configure `altEditor.fields` to define add and edit forms independently of DataTables columns. The array replaces the column-derived form entirely. Its order controls field order, and each `name` identifies a writable row path. A field can edit a property absent from the table or visible in a hidden table column. Display-only columns need no corresponding field.

```js
altEditor: {
  fields: [
    { name: 'name', title: 'Full name', required: true },
    { name: 'email', title: 'Email', type: 'email', required: true },
    {
      name: 'roles',
      title: 'Permissions',
      type: 'select',
      multiple: true,
      options: [
        { id: 1, text: 'Reader' },
        { id: 2, text: 'Writer' },
      ],
      value: [],
      getValue: (roles) => (roles || []).map((role) => role.id),
      setValue: (ids) =>
        ids.map((id) => ({
          id: Number(id),
          label: id === '1' ? 'Reader' : 'Writer',
        })),
    },
  ];
}
```

Fields accept the existing [dialog control options](api.md#column-options), including validation, default `value`, plugins, and change handlers. `title` defaults to `name`, `type` to `text`, and `editable` and `visible` to `true`. Field visibility is independent of column visibility. Disabled controls are omitted from submission. Readonly controls retain the existing submission behavior. Properties outside the form are preserved on edit.

Names support string paths, dotted paths, and numeric array indexes including `0`. Duplicate names, ancestor/descendant pairs such as `profile` and `profile.name`, and unsafe paths are rejected when opening. Use numeric names for every field when creating array rows. An empty array creates an empty form. `null` or an omitted `fields` option keeps the existing column-derived forms unchanged.

Custom template slots use the field `name`. Every generated non-hidden field still needs exactly one slot. Plugins, labels, errors, and `reloadOptions()` use the same generated controls. Cell inline editing continues to use DataTables column configuration and does not consume `fields`, `getValue`, or `setValue`.

## Read and write conversion

Both independent fields and column-derived dialog fields accept these optional functions.

| Function                   | Input                                                            | Return value                                    |
| -------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `getValue(value, context)` | Stored row property for edit, configured default `value` for add | Value suitable for the control                  |
| `setValue(value, context)` | Collected form value after successful validation                 | Value to submit and store at the field's `name` |

Conversions are synchronous. Use persistence callbacks and `editorValidate` for asynchronous work. Neither conversion calls the table display renderer. Without converters, text and number fields submit strings, checkboxes booleans, and multiple selects arrays of strings.

The context contains `editor`, `field`, `operation` (`add` or `edit`), and `originalRowData` (undefined for add). `setValue` also receives `values`, a snapshot of all collected form values before write conversion. Plain objects and arrays passed to each converter are detached copies. Treat context data as read-only, especially File objects and other non-plain values.

`getValue` runs when a field is populated. Uniqueness validation also uses it to compare the control value against the corresponding values in loaded rows. Keep converters deterministic and free of side effects. Uniqueness across unloaded records requires a server constraint.

Submission collects controls, runs native constraints and custom validators against form values, then calls `setValue` for each submitted field. Pre-submit and submit events and persistence callbacks receive the converted values. Edit candidates merge those values into the captured row while preserving unrelated properties. `success(persistedRow)` still replaces the candidate with the complete server response.

A read conversion error rejects opening. A write conversion error appears as a field error and allows correction and retry. Returning a Promise or thenable from either converter is an error. Returning `undefined` from `setValue` writes undefined, so explicitly return the value to store. Empty file inputs and disabled controls do not invoke write conversion.

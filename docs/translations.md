# Translations

[Documentation](README.md) · [Project overview](../README.md)

AltEditor includes the following JSON language files. English is built in and supplies any missing values.

| Language             | File                                     |
| -------------------- | ---------------------------------------- |
| Chinese (Simplified) | [zh-CN.json](../translations/zh-CN.json) |
| Dutch                | [nl-NL.json](../translations/nl-NL.json) |
| French               | [fr-FR.json](../translations/fr-FR.json) |
| German               | [de-DE.json](../translations/de-DE.json) |
| Italian              | [it.json](../translations/it.json)       |
| Japanese             | [ja.json](../translations/ja.json)       |
| Korean               | [ko.json](../translations/ko.json)       |
| Portuguese (Brazil)  | [pt-BR.json](../translations/pt-BR.json) |
| Russian              | [ru.json](../translations/ru.json)       |
| Spanish (Spain)      | [es-ES.json](../translations/es-ES.json) |
| Turkish              | [tr.json](../translations/tr.json)       |
| Ukrainian            | [ua.json](../translations/ua.json)       |

The Ukrainian filename remains `ua.json` for compatibility with existing URLs; the standard language tag for Ukrainian is `uk`.

## Configuration

Serve the JSON files from your application and configure their URL relative to the page:

```javascript
new DataTable('#table', {
  altEditor: true,
  language: {
    altEditorUrl: '/translations/zh-CN.json',
  },
});
```

`altEditorUrl` loads asynchronously with a 15-second timeout. English defaults are available before the request completes and remain in use if the request fails or the JSON structure is invalid. Failures emit `alteditor-error.dt` with `action: 'language'` and a console warning. Labels in an open dialog update when loading succeeds without replacing entered values. To display translated text from the first interaction, load the file before constructing the table:

```javascript
const response = await fetch('/translations/ja.json');
if (!response.ok) throw new Error('Unable to load the translation');
const translation = await response.json();

new DataTable('#table', {
  altEditor: true,
  language: {
    altEditor: {
      ...translation,
      edit: { ...translation.edit, button: '変更を保存' },
    },
  },
});
```

`language.altEditor` takes precedence over `language.altEditorUrl`; supplying both does not merge them. A partial inline object is merged with the English defaults. Copy a supplied JSON file or override its values to customize the wording. Keep its nested object structure and use plain text strings.

## Translation coverage

[Example 09](../example/09_translations/example9.html) includes both Italian JSON loading and a second table with partial inline language overrides and English defaults.

Each supplied file contains all 23 string values from the AltEditor language defaults: `modalClose`, `edit.title`, `edit.button`, `add.title`, `add.button`, `delete.title`, `delete.button`, `deleteMessage`, `success`, `error.message`, `error.label`, `error.responseCode`, `error.required`, `error.unique`, `error.editSelection`, `error.deleteSelection`, `error.targetUnavailable`, `error.invalidResponse`, `error.invalidSetter`, `error.fileRead`, `error.fileAborted`, `error.fileSize`, and `error.dialogFramework`.

The files translate editor dialog labels, deletion confirmation, and applicable operation and uniqueness messages. DataTables search, pagination, and extension labels use DataTables language configuration, including `language.url`, independently. Applications supply toolbar button text, column titles, option labels, custom validation messages, and server error messages. Select2 and date pickers have their own localization settings.

Native HTML constraint validation uses the browser's messages and language. The `error.required` key is retained for compatibility but does not override those native messages. Selection, persistence response, file reading, and missing dialog framework messages use the corresponding `error` keys. Developer configuration exceptions and optional plugin warnings remain in English.

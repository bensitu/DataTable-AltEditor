import { mergeOptions, isPlainObject } from './options.js';

const defaults = {
  modalClose: 'Close',
  edit: { title: 'Edit record', button: 'Edit' },
  delete: { title: 'Delete record', button: 'Delete' },
  add: { title: 'Add record', button: 'Add' },
  deleteMessage: 'Are you sure you wish to delete the selected row(s)?',
  success: 'Success!',
  error: {
    message: 'There was an unknown error!',
    label: 'Error!',
    responseCode: 'Response code: ',
    required: 'Field is required',
    unique: 'Duplicated field',
    editSelection: 'Exactly one row must be selected for editing.',
    deleteSelection: 'At least one row must be selected for deletion.',
    targetUnavailable: 'Target row is unavailable',
    invalidResponse: 'Persistence must return a row object or array',
    invalidSetter: 'inlineEditSetValue must return a row object or array',
    fileRead: 'Failed to read file',
    fileAborted: 'File read was aborted',
    fileSize: 'File exceeds the configured size limit',
    dialogFramework:
      'Bootstrap Modal or Foundation Reveal is required to open AltEditor dialogs',
    nativeDialog:
      'Native dialogs require a browser with HTMLDialogElement.showModal support',
  },
};

export function resolveLanguage(input) {
  if (!isPlainObject(input))
    throw new TypeError('Language configuration must be an object');
  const language = mergeOptions(defaults, input);
  const validate = (expected, actual) =>
    Object.keys(expected).every((key) =>
      typeof expected[key] === 'string'
        ? typeof actual[key] === 'string'
        : isPlainObject(actual[key]) && validate(expected[key], actual[key])
    );
  if (!validate(defaults, language))
    throw new TypeError('Language values must be strings');
  return language;
}

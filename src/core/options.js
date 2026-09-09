export function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== '[object Object]')
    return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function mergeOptions() {
  const result = {};
  Array.prototype.slice.call(arguments).forEach((source) => {
    if (!isPlainObject(source)) return;
    Object.keys(source).forEach((key) => {
      if (['__proto__', 'prototype', 'constructor'].indexOf(key) !== -1)
        throw new Error('Unsafe option key: ' + key);
      const value = source[key];
      result[key] = Array.isArray(value)
        ? value.slice()
        : isPlainObject(value)
          ? mergeOptions(result[key], value)
          : value;
    });
  });
  return result;
}

/** @typedef {Object} EditorOptions
 * @property {boolean} [closeModalOnSuccess=true] Close dialogs after successful persistence.
 * @property {boolean} [encodeFiles=true] Read uploaded files as data URLs.
 * @property {boolean} [debug=false] Enable diagnostic messages.
 * @property {Object|boolean} [inlineEdit] Cell editing configuration.
 */
export const defaults = {
  closeModalOnSuccess: true,
  encodeFiles: true,
  debug: false,
  inlineEdit: {
    enabled: false,
    submitOnBlur: false,
    selectText: true,
    tabNavigation: true,
  },
};

export function normalizeOptions(base, init, supplied) {
  const root = {};
  [
    'closeModalOnSuccess',
    'encodeFiles',
    'debug',
    'onAddRow',
    'onEditRow',
    'onDeleteRow',
    'onInlineEditRow',
  ].forEach((key) => {
    if (init[key] !== undefined) root[key] = init[key];
  });
  const options = mergeOptions(defaults, base, root, init.altEditor, supplied);
  options.inlineEdit = mergeOptions(
    defaults.inlineEdit,
    options.inlineEdit === true ? { enabled: true } : options.inlineEdit
  );
  return options;
}

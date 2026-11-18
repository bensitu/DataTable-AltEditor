import { normalizeColumns } from '../core/columns.js';
import { isPlainObject } from '../core/options.js';
import { isFieldPath } from './path.js';
import { cloneRow } from './row-data.js';

function validateFieldNames(fields) {
  const names = [];
  fields.forEach((field) => {
    if (!isPlainObject(field) || !isFieldPath(field.name))
      throw new TypeError('Each form field requires a writable name');
    const name = String(field.name);
    if (
      names.some(
        (other) =>
          other === name ||
          other.startsWith(name + '.') ||
          name.startsWith(other + '.')
      )
    )
      throw new TypeError('Form field names must not overlap: ' + name);
    names.push(name);
  });
}

export function normalizeFields(fields, api) {
  if (fields == null) {
    const columns = normalizeColumns(api);
    validateFieldNames(
      columns.filter(
        (field) =>
          isFieldPath(field.name) &&
          !field.disabled &&
          field.type !== 'radio' &&
          (field.type === 'hidden' ||
            (field.editable !== false && String(field.title || '').trim()))
      )
    );
    return columns;
  }
  validateFieldNames(fields);
  return fields.map((field) => {
    const name = String(field.name);
    ['getValue', 'setValue'].forEach((key) => {
      if (field[key] !== undefined && typeof field[key] !== 'function')
        throw new TypeError(key + ' must be a function');
    });
    const result = Object.assign(
      {
        title: name,
        editable: true,
        visible: true,
        type: 'text',
        rows: 5,
        cols: 30,
        options: [],
      },
      field
    );
    if (result.type === 'readonly') {
      result.type = 'text';
      result.readonly = true;
    }
    if (result.placeholder === undefined) result.placeholder = result.title;
    return result;
  });
}

export function transformField(
  field,
  method,
  value,
  editor,
  operation,
  originalRowData,
  values
) {
  if (field[method] === undefined) return value;
  if (typeof field[method] !== 'function')
    throw new TypeError(method + ' must be a function');
  let originalCopy;
  let copied = false;
  const result = field[method](cloneRow(value), {
    editor,
    field: field.name,
    operation,
    get originalRowData() {
      if (!copied) {
        originalCopy = cloneRow(originalRowData);
        copied = true;
      }
      return originalCopy;
    },
    values: cloneRow(values),
  });
  if (result != null && typeof result.then === 'function') {
    Promise.resolve(result).catch(() => {});
    throw new TypeError(method + ' must return a synchronous value');
  }
  return result;
}

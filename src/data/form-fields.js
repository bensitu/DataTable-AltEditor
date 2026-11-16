import { normalizeColumns } from '../core/columns.js';
import { isPlainObject } from '../core/options.js';
import { isFieldPath } from './path.js';
import { cloneRow } from './row-data.js';

export function normalizeFields(fields, api) {
  if (fields == null) return normalizeColumns(api);
  const names = [];
  return fields.map((field) => {
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
  const result = field[method](cloneRow(value), {
    editor,
    field: field.name,
    operation,
    originalRowData: cloneRow(originalRowData),
    values: cloneRow(values),
  });
  if (result != null && typeof result.then === 'function') {
    Promise.resolve(result).catch(() => {});
    throw new TypeError(method + ' must return a synchronous value');
  }
  return result;
}

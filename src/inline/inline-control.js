import { document } from '../core/dependencies.js';
import { mergeOptions } from '../core/options.js';
import { normalizeSelectOptions, isChecked } from '../data/field-values.js';
import { segments } from '../data/path.js';

const types = [
  'text',
  'number',
  'email',
  'date',
  'time',
  'datetime-local',
  'textarea',
  'select',
  'checkbox',
];

export function controlOptions(column) {
  if (
    !column ||
    column.readonly ||
    column.disabled ||
    column.type === 'hidden' ||
    column.type === 'file' ||
    column.type === 'readonly'
  )
    return null;
  if (
    column.inlineEditable === false ||
    (column.inlineEditable === undefined && column.editable === false)
  )
    return null;
  if (column.name === null || column.name === undefined) return null;
  if (typeof column.name !== 'number' && typeof column.name !== 'string') {
    if (typeof column.inlineEditSetValue !== 'function') return null;
  } else {
    try {
      segments(column.name);
    } catch (_error) {
      return null;
    }
    if (
      typeof column.name === 'string' &&
      /[\[\]()\\]/.test(column.name) &&
      typeof column.inlineEditSetValue !== 'function'
    )
      return null;
  }
  const options = mergeOptions(column, column.inlineEditOptions);
  options.type = column.inlineEditType || column.type || 'text';
  return types.indexOf(options.type) === -1 ||
    options.readonly ||
    options.disabled
    ? null
    : options;
}

export function createControl(options, value) {
  const type = options.type;
  const control = document.createElement(
    type === 'select' || type === 'textarea' ? type : 'input'
  );
  if (control.tagName === 'INPUT') control.type = type;
  control.className = 'alteditor-inline-control';
  control.setAttribute('aria-label', options.title || 'Edit value');
  [
    'required',
    'multiple',
    'min',
    'max',
    'step',
    'pattern',
    'maxLength',
    'rows',
    'cols',
    'placeholder',
  ].forEach((key) => {
    if (options[key] != null && options[key] !== false)
      control.setAttribute(
        key,
        options[key] === true ? '' : String(options[key])
      );
  });
  if (type === 'select') {
    let entries = normalizeSelectOptions(options.options);
    if (options.optionsSortByLabel)
      entries = entries
        .slice()
        .sort((a, b) => String(a.label).localeCompare(String(b.label)));
    entries.forEach((entry) => {
      const option = document.createElement('option');
      option.value = String(entry.value);
      option.textContent = String(
        entry.label === undefined ? entry.value : entry.label
      );
      control.appendChild(option);
    });
  }
  if (type === 'checkbox') control.checked = isChecked(value);
  else if (type === 'select' && options.multiple) {
    const values = (Array.isArray(value) ? value : [value]).map(String);
    Array.prototype.forEach.call(control.options, (option) => {
      option.selected = values.indexOf(option.value) !== -1;
    });
  } else control.value = value == null ? '' : value;
  return control;
}

export function controlValue(control) {
  if (control.type === 'checkbox') return control.checked;
  if (control.type === 'number')
    return control.value === '' ? '' : control.valueAsNumber;
  if (control.tagName === 'SELECT' && control.multiple)
    return Array.prototype.filter
      .call(control.options, (option) => option.selected)
      .map((option) => option.value);
  return control.value;
}

import { $ } from '../core/dependencies.js';

export function createSelectOption(select, value, label) {
  const option = select.ownerDocument.createElement('option');
  option.value = String(value);
  option.textContent = String(label);
  return option;
}

/** Preserve stored selections that are absent from the configured options. */
export function setSelectValue(control, value) {
  let values = value == null ? [] : Array.isArray(value) ? value : [value];
  const available = new Set(
    Array.from(control.options, (option) => option.value)
  );
  if (control.multiple && typeof value === 'string' && !available.has(value)) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) values = parsed;
    } catch (_error) {}
  }
  values = values.map(String);
  values.forEach((value) => {
    if (value !== '' && !available.has(value)) {
      control.appendChild(createSelectOption(control, value, value));
      available.add(value);
    }
  });
  $(control).val(control.multiple ? values : values.length ? values[0] : '');
}

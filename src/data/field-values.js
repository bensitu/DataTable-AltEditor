import { $ } from '../core/dependencies.js';

export function fieldElement(container, name) {
  return $(container)
    .find('input, select, textarea')
    .filter(function () {
      return this.id === String(name);
    });
}

export function equalFieldValues(left, right, type) {
  const values = (value) => (Array.isArray(value) ? value : [value]);
  return values(left).some((a) =>
    values(right).some((b) => {
      if (a === '' || a == null || b === '' || b == null) return false;
      if (type === 'number')
        return (
          Number.isFinite(Number(a)) &&
          Number.isFinite(Number(b)) &&
          Number(a) === Number(b)
        );
      return String(a) === String(b);
    })
  );
}

export function normalizeSelectOptions(options) {
  if (Array.isArray(options)) {
    return options.map(function (option) {
      if (option && typeof option === 'object') {
        var value =
          option.id !== undefined
            ? option.id
            : option.value !== undefined
              ? option.value
              : '';
        var label =
          option.text !== undefined
            ? option.text
            : option.label !== undefined
              ? option.label
              : value;
        return { value: value, label: label };
      }
      return { value: option, label: option };
    });
  }
  if (options && typeof options === 'object') {
    return Object.keys(options).map(function (key) {
      return { value: key, label: options[key] };
    });
  }
  return [];
}

export function isChecked(value) {
  return (
    value === true ||
    value === 1 ||
    ['true', '1', 'yes', 'on'].indexOf(String(value).toLowerCase()) !== -1
  );
}

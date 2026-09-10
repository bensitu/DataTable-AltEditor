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

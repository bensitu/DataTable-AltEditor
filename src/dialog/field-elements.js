import { $ } from '../core/dependencies.js';

export function fieldElement(container, name) {
  const fieldName = String(name);
  return $(container)
    .find('input, select, textarea')
    .filter(function () {
      return (this.name || this.id) === fieldName;
    });
}

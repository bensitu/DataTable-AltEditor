import { $ } from '../core/dependencies.js';

export function fieldControls(container) {
  return $(container).find('input, select, textarea');
}

export function indexFieldControls(container) {
  const controls = new Map();
  fieldControls(container).each(function () {
    const name = this.name || this.id;
    if (!name) return;
    const matching = controls.get(name);
    if (matching) matching.push(this);
    else controls.set(name, [this]);
  });
  return controls;
}

export function fieldElement(container, name) {
  const fieldName = String(name);
  return fieldControls(container).filter(function () {
    return (this.name || this.id) === fieldName;
  });
}

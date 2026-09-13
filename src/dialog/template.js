import { document } from '../core/dependencies.js';

/** Clone application markup and place generated fields into named slots. */
export function applyTemplate(source, fields, context) {
  if (typeof source === 'function') source = source(context);
  if (source == null) return fields;
  if (typeof source === 'string') source = document.querySelector(source);
  if (!source || ![1, 11].includes(source.nodeType))
    throw new TypeError(
      'Dialog template must resolve to an element or fragment'
    );
  const layout = document.createElement('div');
  layout.className = 'altEditor-template';
  layout.appendChild((source.content || source).cloneNode(true));
  if (layout.querySelector('form, input, select, textarea, [contenteditable]'))
    throw new Error(
      'Dialog templates must use field slots instead of form controls'
    );
  const identifiers = new Map();
  layout.querySelectorAll('[id]').forEach((element, index) => {
    if (identifiers.has(element.id))
      throw new Error('Duplicate dialog template identifier: ' + element.id);
    const id = context.editor.random_id + '-template-' + index;
    identifiers.set(element.id, id);
    element.id = id;
  });
  layout.querySelectorAll('*').forEach((element) => {
    [
      'for',
      'aria-labelledby',
      'aria-describedby',
      'aria-controls',
      'aria-owns',
    ].forEach((attribute) => {
      if (element.hasAttribute(attribute))
        element.setAttribute(
          attribute,
          element
            .getAttribute(attribute)
            .split(/\s+/)
            .map((id) => identifiers.get(id) || id)
            .join(' ')
        );
    });
    const href = element.getAttribute('href');
    if (href && href[0] === '#' && identifiers.has(href.slice(1)))
      element.setAttribute('href', '#' + identifiers.get(href.slice(1)));
  });
  const groups = new Map();
  fields.querySelectorAll('.altEditor-field').forEach((field) => {
    const control = field.querySelector('[name]');
    if (control) groups.set(control.name, field);
  });
  layout.querySelectorAll('[data-alteditor-field]').forEach((slot) => {
    const name = slot.getAttribute('data-alteditor-field');
    const field = groups.get(name);
    if (!field || slot.querySelector('[data-alteditor-field]'))
      throw new Error(
        'Unknown, duplicate, or nested dialog field slot: ' + name
      );
    slot.replaceChildren(field);
    groups.delete(name);
  });
  if (groups.size)
    throw new Error(
      'Missing dialog field slots: ' + [...groups.keys()].join(', ')
    );
  fields
    .querySelectorAll('input[type="hidden"]')
    .forEach((field) => layout.appendChild(field));
  return layout;
}

/** Render a deletion summary without interpreting strings as HTML. */
export function deletionContent(option, context) {
  if (option === false || option == null) return null;
  const value = typeof option === 'function' ? option(context) : option;
  if (value === false || value == null) return null;
  if (typeof value === 'string') return document.createTextNode(value);
  if (value && [1, 11].includes(value.nodeType)) return value;
  throw new TypeError(
    'Delete details must return text, an element, or a fragment'
  );
}

import { document } from '../core/dependencies.js';

const identifierAttributes = [
  'for',
  'headers',
  'itemref',
  'aria-activedescendant',
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
  'aria-labelledby',
  'aria-owns',
];
const urlAttributes = [
  'clip-path',
  'fill',
  'filter',
  'marker',
  'marker-end',
  'marker-mid',
  'marker-start',
  'mask',
  'stroke',
  'style',
];

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
    const id = context.editor._instanceId + '-template-' + index;
    identifiers.set(element.id, id);
    element.id = id;
  });
  layout.querySelectorAll('*').forEach((element) => {
    identifierAttributes.forEach((attribute) => {
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
    ['href', 'xlink:href'].forEach((attribute) => {
      const node = element.getAttributeNode(attribute);
      if (!node || !node.value.startsWith('#')) return;
      const id = identifiers.get(node.value.slice(1));
      if (id) node.value = '#' + id;
    });
    urlAttributes.forEach((attribute) => {
      const node = element.getAttributeNode(attribute);
      if (node)
        node.value = node.value.replace(
          /url\(\s*(['"]?)#([^'"\s)]+)\1\s*\)/g,
          (match, quote, id) =>
            identifiers.has(id)
              ? 'url(' + quote + '#' + identifiers.get(id) + quote + ')'
              : match
        );
    });
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

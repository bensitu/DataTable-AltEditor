import { $, document, root } from '../core/dependencies.js';
import { fieldElement } from '../data/field-values.js';
import { normalizeError } from '../data/errors.js';

export function clearFieldErrors(editor, name) {
  if (!editor._fieldErrors) return;
  editor._fieldErrors.forEach((entry, key) => {
    if (name !== undefined && key !== String(name)) return;
    entry.controls.forEach(({ element, invalid, styled }) => {
      const ids = (element.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== entry.node.id);
      if (ids.length) element.setAttribute('aria-describedby', ids.join(' '));
      else element.removeAttribute('aria-describedby');
      if (invalid === null) element.removeAttribute('aria-invalid');
      else element.setAttribute('aria-invalid', invalid);
      if (!styled) element.classList.remove('altEditor-field-invalid');
    });
    entry.node.remove();
    editor._fieldErrors.delete(key);
  });
}

/** Locate an editable visible control, including the visible Select2 replacement. */
export function feedbackControl(element, modal) {
  if (
    !element ||
    element.disabled ||
    element.readOnly ||
    element.type === 'hidden'
  )
    return null;
  const replacement = $(element).hasClass('select2-hidden-accessible')
    ? $(element).next('.select2-container').find('.select2-selection')[0]
    : null;
  const target = replacement || element;
  for (let node = target; node && node !== modal; node = node.parentElement) {
    const style = root.getComputedStyle(node);
    if (
      node.hidden ||
      style.display === 'none' ||
      style.visibility === 'hidden'
    )
      return null;
  }
  return target;
}

export function showFieldErrors(editor, error) {
  clearFieldErrors(editor);
  const feedback = normalizeError(error, editor.language.error);
  const messages = feedback.message ? [feedback.message] : [];
  const modal = $(editor.modal_selector)[0];
  let first;
  editor._fieldErrors = new Map();
  feedback.fields.forEach(([name, message]) => {
    const element = fieldElement(modal, name)[0];
    const target = editor._dialogOpen && feedbackControl(element, modal);
    if (!target) {
      messages.push(message);
      return;
    }
    const node = document.createElement('span');
    node.className = 'altEditor-field-error';
    editor._fieldErrorId = (editor._fieldErrorId || 0) + 1;
    node.id = editor.random_id + '-error-' + editor._fieldErrorId;
    node.setAttribute('role', 'alert');
    node.textContent = message;
    const search = $(element)
      .next('.select2-container')
      .find('.select2-search__field')[0];
    const controls = [
      ...new Set([element, target, search].filter(Boolean)),
    ].map((control) => {
      const state = {
        element: control,
        invalid: control.getAttribute('aria-invalid'),
        styled: control.classList.contains('altEditor-field-invalid'),
      };
      control.setAttribute('aria-invalid', 'true');
      const described = control.getAttribute('aria-describedby');
      control.setAttribute(
        'aria-describedby',
        described ? described + ' ' + node.id : node.id
      );
      control.classList.add('altEditor-field-invalid');
      return state;
    });
    const container = $(element).next('.select2-container')[0] || element;
    container.insertAdjacentElement('afterend', node);
    editor._fieldErrors.set(name, { node, controls });
    if (!first) first = search || target;
  });
  $(modal).find('.altEditor-feedback').remove();
  if (messages.length) editor._showErrorMessage(messages.join('\n'));
  if (first && first.isConnected) first.focus();
}

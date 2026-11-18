import { document } from '../core/dependencies.js';
import { createSelectOption } from '../controls/select-control.js';
import { normalizeSelectOptions } from '../data/field-values.js';
import { isFieldPath } from '../data/path.js';

/** Build detached field controls without opening a dialog or initializing plugins. */
export function renderFields(fieldDefinitions, instanceId) {
  var fragment = document.createDocumentFragment();
  var container = document.createElement('div');
  container.className = 'altEditor-fields';
  var row = document.createElement('div');
  row.className = 'altEditor-field-list';
  var col = document.createElement('div');
  col.className = 'altEditor-field-content';
  row.appendChild(col);
  container.appendChild(row);
  fragment.appendChild(container);

  var inlineCount = 0;

  fieldDefinitions.forEach(function (field, index) {
    var fieldId = instanceId + '-field-' + index;
    var title = String(field.title || '').trim();
    if (!isFieldPath(field.name) || field.type === 'radio') return;

    if (field.type === 'hidden') {
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = fieldId;
      setElementAttributes(hidden, field, ['name', 'disabled']);
      if (field.value !== undefined && field.value !== null)
        hidden.value = field.value;
      col.appendChild(hidden);
      return;
    }

    if (!title || field.editable === false) return;

    var formGroup = document.createElement('div');
    formGroup.className =
      'altEditor-field' + (field.visible === false ? ' nonDisplay' : '');
    formGroup.id = fieldId + '-row';

    if (!field.inline || inlineCount === 0) {
      var labelCol = document.createElement('div');
      labelCol.className = 'altEditor-label';
      var label = document.createElement('label');
      label.className = 'col-form-label col-form-label-sm';
      label.htmlFor = fieldId;
      label.id = fieldId + '-label';
      label.textContent = title + ':';
      labelCol.appendChild(label);
      formGroup.appendChild(labelCol);
    }

    var inputCol = document.createElement('div');
    inputCol.className =
      'altEditor-input' + (field.inline ? ' altEditor-input-compact' : '');
    formGroup.appendChild(inputCol);

    var type = String(field.type || 'text');
    if (type === 'select') {
      var select = document.createElement('select');
      select.className =
        'form-control form-control-sm' + (field.select2 ? ' select2' : '');
      select.id = fieldId;
      setElementAttributes(select, field, [
        'name',
        'style',
        'disabled',
        'required',
        'multiple',
      ]);
      select.setAttribute('data-unique', field.unique ? 'true' : 'false');
      if (field.placeholder != null)
        select.setAttribute('data-placeholder', String(field.placeholder));

      var normalized = normalizeSelectOptions(field.options);
      normalized.forEach(function (option) {
        const optionElement = createSelectOption(
          select,
          option.value,
          option.label
        );
        if (optionElement.value === String(field.value))
          optionElement.selected = true;
        select.appendChild(optionElement);
      });
      inputCol.appendChild(select);
    } else if (type === 'textarea') {
      var textarea = document.createElement('textarea');
      textarea.className = 'form-control form-control-sm';
      textarea.id = fieldId;
      setElementAttributes(textarea, field, [
        'name',
        'style',
        'rows',
        'cols',
        'maxLength',
        'readonly',
        'disabled',
        'required',
      ]);
      textarea.placeholder = String(
        field.placeholder == null ? title : field.placeholder
      );
      textarea.setAttribute('data-unique', field.unique ? 'true' : 'false');
      if (field.value !== undefined && field.value !== null)
        textarea.value = field.value;
      inputCol.appendChild(textarea);
    } else {
      var input = document.createElement('input');
      input.className =
        'form-control form-control-sm' +
        (field.readonly ? ' readonlyText' : '');
      input.id = fieldId;
      input.title = String(field.hoverMsg || '');
      input.placeholder = String(
        field.placeholder == null ? title : field.placeholder
      );
      input.setAttribute('data-unique', field.unique ? 'true' : 'false');
      setElementAttributes(input, field, [
        'type',
        'pattern',
        'accept',
        'name',
        'step',
        'min',
        'max',
        'maxLength',
        'readonly',
        'disabled',
        'required',
        'style',
      ]);
      if (field.value !== undefined && field.value !== null)
        input.value = field.value;
      inputCol.appendChild(input);
    }

    if (field.inline && inlineCount > 0) {
      inputCol
        .querySelector('input, select, textarea')
        .setAttribute('aria-label', title);
    }
    col.appendChild(formGroup);
    inlineCount++;
  });

  return fragment;
}

function setElementAttributes(element, field, attributes) {
  if (field.special !== undefined)
    element.setAttribute('data-special', String(field.special));
  attributes.forEach(function (attribute) {
    var value = field[attribute];
    if (value === undefined || value === null || value === false) return;
    if (['disabled', 'readonly', 'required', 'multiple'].includes(attribute)) {
      if (value) element.setAttribute(attribute, '');
      return;
    }
    if (typeof value === 'boolean') {
      element.setAttribute(attribute, '');
      return;
    }
    if (attribute === 'style' && typeof value === 'object') {
      Object.keys(value).forEach(function (property) {
        element.style[property] = value[property];
      });
      return;
    }
    element.setAttribute(attribute, String(value));
  });
}

export const methods = {
  _normalizeOptions: normalizeSelectOptions,
  _setElementAttributes: setElementAttributes,
};

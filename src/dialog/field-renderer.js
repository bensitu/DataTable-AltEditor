import { document } from '../core/dependencies.js';
import { normalizeSelectOptions } from '../data/field-values.js';
import { isFieldPath } from '../data/path.js';

/** Build detached field controls without opening a dialog or initializing plugins. */
export function renderFields(columnDefs, instanceId) {
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

  columnDefs.forEach(function (columnDef, index) {
    var fieldId = instanceId + '-field-' + index;
    var title = String(columnDef.title || '').trim();
    if (!isFieldPath(columnDef.name) || columnDef.type === 'radio') return;

    if (String(columnDef.type).indexOf('hidden') >= 0) {
      var hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = fieldId;
      setElementAttributes(hidden, columnDef, ['name', 'disabled']);
      if (columnDef.value !== undefined && columnDef.value !== null)
        hidden.value = columnDef.value;
      col.appendChild(hidden);
      return;
    }

    if (!title || columnDef.editable === false) return;

    var formGroup = document.createElement('div');
    formGroup.className =
      'altEditor-field' + (columnDef.visible === false ? ' nonDisplay' : '');
    formGroup.id = fieldId + '-row';

    if (!columnDef.inline || inlineCount === 0) {
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
      'altEditor-input' + (columnDef.inline ? ' altEditor-input-compact' : '');
    formGroup.appendChild(inputCol);

    var type = String(columnDef.type || 'text');
    if (type.indexOf('select') >= 0) {
      var select = document.createElement('select');
      select.className =
        'form-control form-control-sm' + (columnDef.select2 ? ' select2' : '');
      select.id = fieldId;
      setElementAttributes(select, columnDef, [
        'name',
        'style',
        'disabled',
        'required',
        'multiple',
      ]);
      select.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
      if (columnDef.placeholder != null)
        select.setAttribute('data-placeholder', String(columnDef.placeholder));

      var normalized = normalizeSelectOptions(columnDef.options);
      normalized.forEach(function (option) {
        var optionElement = document.createElement('option');
        optionElement.value = String(option.value);
        optionElement.textContent = String(option.label);
        if (String(option.value) === String(columnDef.value))
          optionElement.selected = true;
        select.appendChild(optionElement);
      });
      inputCol.appendChild(select);
    } else if (type.indexOf('textarea') >= 0) {
      var textarea = document.createElement('textarea');
      textarea.className = 'form-control form-control-sm';
      textarea.id = fieldId;
      setElementAttributes(textarea, columnDef, [
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
        columnDef.placeholder == null ? title : columnDef.placeholder
      );
      textarea.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
      if (columnDef.value !== undefined && columnDef.value !== null)
        textarea.value = columnDef.value;
      inputCol.appendChild(textarea);
    } else {
      var input = document.createElement('input');
      input.className =
        'form-control form-control-sm' +
        (columnDef.readonly ? ' readonlyText' : '');
      input.id = fieldId;
      input.title = String(columnDef.hoverMsg || '');
      input.placeholder = String(
        columnDef.placeholder == null ? title : columnDef.placeholder
      );
      input.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
      setElementAttributes(input, columnDef, [
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
      if (columnDef.value !== undefined && columnDef.value !== null)
        input.value = columnDef.value;
      inputCol.appendChild(input);
    }

    if (columnDef.inline && inlineCount > 0) {
      inputCol
        .querySelector('input, select, textarea')
        .setAttribute('aria-label', title);
    }
    col.appendChild(formGroup);
    inlineCount++;
  });

  return fragment;
}

function setElementAttributes(element, columnDef, attributes) {
  if (columnDef.special !== undefined)
    element.setAttribute('data-special', String(columnDef.special));
  attributes.forEach(function (attribute) {
    var value = columnDef[attribute];
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

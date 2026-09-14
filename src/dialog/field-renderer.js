import { applyTemplate } from './template.js';
import { renderDialog } from './dialog-view.js';
import { $, document } from '../core/dependencies.js';
import { normalizeSelectOptions, fieldElement } from '../data/field-values.js';
import { isFieldPath } from '../data/path.js';

export const methods = {
  createDialog: function (
    columnDefs,
    modalTitle,
    buttonCaption,
    closeCaption,
    buttonClass,
    formName
  ) {
    formName = formName + '-' + this.random_id;
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

    var that = this;
    var inlineCount = 0;

    columnDefs.forEach(function (columnDef) {
      var title = String(columnDef.title || '').trim();
      if (!isFieldPath(columnDef.name) || columnDef.type === 'radio') return;

      if (String(columnDef.type).indexOf('hidden') >= 0) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = String(columnDef.name);
        that._setElementAttributes(hidden, columnDef, ['name', 'disabled']);
        if (columnDef.value !== undefined && columnDef.value !== null)
          hidden.value = columnDef.value;
        col.appendChild(hidden);
        return;
      }

      if (!title || columnDef.editable === false) return;

      var formGroup = document.createElement('div');
      formGroup.className =
        'altEditor-field' + (columnDef.visible === false ? ' nonDisplay' : '');
      formGroup.id = 'alteditor-row-' + String(columnDef.name);

      if (!columnDef.inline || inlineCount === 0) {
        var labelCol = document.createElement('div');
        labelCol.className = 'altEditor-label';
        var label = document.createElement('label');
        label.className = 'col-form-label col-form-label-sm';
        label.htmlFor = String(columnDef.name);
        label.textContent = title + ':';
        labelCol.appendChild(label);
        formGroup.appendChild(labelCol);
      }

      var inputCol = document.createElement('div');
      inputCol.className =
        'altEditor-input' +
        (columnDef.inline ? ' altEditor-input-compact' : '');
      formGroup.appendChild(inputCol);

      var type = String(columnDef.type || 'text');
      if (type.indexOf('select') >= 0) {
        var select = document.createElement('select');
        select.className =
          'form-control form-control-sm' +
          (columnDef.select2 ? ' select2' : '');
        select.id = String(columnDef.name);
        that._setElementAttributes(select, columnDef, [
          'name',
          'style',
          'disabled',
          'required',
          'multiple',
        ]);
        select.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
        if (columnDef.placeholder != null)
          select.setAttribute(
            'data-placeholder',
            String(columnDef.placeholder)
          );

        var normalized = that._normalizeOptions(columnDef.options);
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
        textarea.id = String(columnDef.name);
        that._setElementAttributes(textarea, columnDef, [
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
        textarea.setAttribute(
          'data-unique',
          columnDef.unique ? 'true' : 'false'
        );
        if (columnDef.value !== undefined && columnDef.value !== null)
          textarea.value = columnDef.value;
        inputCol.appendChild(textarea);
      } else {
        var input = document.createElement('input');
        input.className =
          'form-control form-control-sm' +
          (columnDef.readonly ? ' readonlyText' : '');
        input.id = String(columnDef.name);
        input.title = String(columnDef.hoverMsg || '');
        input.placeholder = String(
          columnDef.placeholder == null ? title : columnDef.placeholder
        );
        input.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
        that._setElementAttributes(input, columnDef, [
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

    this.columnDefs = columnDefs;
    var selector = this.modal_selector;
    var fill = function () {
      renderDialog($(selector), {
        title: modalTitle,
        body: applyTemplate(
          that.c.dialog.templates[buttonClass === 'addRowBtn' ? 'add' : 'edit'],
          fragment.cloneNode(true),
          that._dialogContext
        ),
        closeCaption,
        buttonCaption,
        buttonId: buttonClass,
        formName,
      });
    };

    if (this.internalOpenDialog(selector, fill) === false) return false;
    this._initializePlugins();
    return true;
  },
  _populateDialogFields: function (columns, rowData) {
    for (const column of columns) {
      if (this._destroyed) return;
      if (!isFieldPath(column.name) || column.editable === false) continue;
      const value =
        rowData === undefined
          ? column.value
          : this._getValueByPath(rowData, column.name);
      if (rowData === undefined && value == null) continue;
      const element = fieldElement(this.modal_selector, column.name).filter(
        ':input[type!="file"]'
      );
      if (!element.length) continue;
      this._setFieldValue(element, column, value);
      element.trigger('change');
    }
  },
  _normalizeOptions: normalizeSelectOptions,
  _setElementAttributes: function (element, columnDef, attributes) {
    if (columnDef.special !== undefined)
      element.setAttribute('data-special', String(columnDef.special));
    attributes.forEach(function (attribute) {
      var value = columnDef[attribute];
      if (value === undefined || value === null || value === false) return;
      if (
        ['disabled', 'readonly', 'required', 'multiple'].includes(attribute)
      ) {
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
  },
};

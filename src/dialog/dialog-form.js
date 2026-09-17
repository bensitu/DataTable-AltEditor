import { clearFieldErrors } from './field-feedback.js';
import { $ } from '../core/dependencies.js';
import { fieldElement } from '../data/field-values.js';
import { isFieldPath } from '../data/path.js';
import { applyTemplate } from './template.js';
import { renderFields } from './field-renderer.js';
import { renderDialog } from './dialog-view.js';

export const methods = {
  createDialog: function (
    columnDefs,
    modalTitle,
    buttonCaption,
    closeCaption,
    buttonClass,
    formName
  ) {
    clearFieldErrors(this);
    this.columnDefs = columnDefs;
    const fields = renderFields(columnDefs, this.random_id);
    const body = applyTemplate(
      this.c.dialog.templates[buttonClass === 'addRowBtn' ? 'add' : 'edit'],
      fields,
      this._dialogContext
    );
    if (this._destroyed) return false;
    const fill = () =>
      renderDialog($(this.modal_selector), {
        title: modalTitle,
        body,
        closeCaption,
        buttonCaption,
        buttonId: buttonClass,
        formName: formName + '-' + this.random_id,
      });
    if (this.internalOpenDialog(this.modal_selector, fill) === false)
      return false;
    this._initializePlugins();
    return true;
  },
  _openFormDialog: function (action, rowData) {
    try {
      const columns = this.completeColumnDefs();
      if (
        this.createDialog(
          columns,
          this.language[action].title,
          this.language[action].button,
          this.language.modalClose,
          action + 'RowBtn',
          'altEditor-' + action + '-form'
        ) === false
      )
        return false;
      this._populateDialogFields(columns, rowData);
      this._finishDialogOpening(action);
    } catch (error) {
      return this._abortDialogOpening(error);
    }
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
};

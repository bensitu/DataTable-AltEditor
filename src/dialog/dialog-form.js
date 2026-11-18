import { clearFieldErrors } from './field-feedback.js';
import { $ } from '../core/dependencies.js';
import { fieldElement, indexFieldControls } from './field-elements.js';
import { isFieldPath } from '../data/path.js';
import { applyTemplate } from './template.js';
import { renderFields } from './field-renderer.js';
import { renderDialog } from './dialog-view.js';
import { transformField } from '../data/form-fields.js';

export const methods = {
  createDialog: function (
    fieldDefinitions,
    modalTitle,
    buttonCaption,
    closeCaption,
    buttonId,
    formName,
    action = buttonId === 'addRowBtn' ? 'add' : 'edit'
  ) {
    clearFieldErrors(this);
    this._dialogFieldDefinitions = fieldDefinitions;
    const fields = renderFields(fieldDefinitions, this._instanceId);
    const body = applyTemplate(
      this.c.dialog.templates[action],
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
        buttonId,
        formName: formName + '-' + this._instanceId,
      });
    if (this.internalOpenDialog(this.modal_selector, fill) === false)
      return false;
    this._initializePlugins();
    return true;
  },
  _openFormDialog: function (action, rowData) {
    try {
      const fieldDefinitions = this.completeFieldDefs();
      if (
        this.createDialog(
          fieldDefinitions,
          this.language[action].title,
          this.language[action].button,
          this.language.modalClose,
          action + 'RowBtn',
          'altEditor-' + action + '-form',
          action
        ) === false
      )
        return false;
      this._populateDialogFields(fieldDefinitions, rowData);
      this._finishDialogOpening(action);
    } catch (error) {
      return this._abortDialogOpening(error);
    }
  },
  _populateDialogFields: function (fieldDefinitions, rowData) {
    const modal = $(this.modal_selector)[0];
    const controlsByName = indexFieldControls(modal);
    for (const field of fieldDefinitions) {
      if (this._destroyed) return;
      if (!isFieldPath(field.name) || field.editable === false) continue;
      const name = String(field.name);
      const indexed = controlsByName.get(name);
      const controls =
        indexed &&
        indexed.some(
          (element) =>
            !modal.contains(element) || (element.name || element.id) !== name
        )
          ? fieldElement(modal, name)
          : $(indexed);
      const stored =
        rowData === undefined
          ? field.value
          : this._getValueByPath(rowData, field.name);
      if (field.type === 'file') {
        if (rowData !== undefined && stored != null && stored !== '')
          controls.prop('required', false);
        continue;
      }
      const element = controls.filter(':input[type!="file"]');
      if (!element.length) continue;
      const value = transformField(
        field,
        'getValue',
        stored,
        this,
        rowData === undefined ? 'add' : 'edit',
        rowData
      );
      if (rowData === undefined && value == null) continue;
      this._setFieldValue(element, field, value, false);
      element.trigger('change');
    }
  },
};

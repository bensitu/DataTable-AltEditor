import { $ } from '../core/dependencies.js';
import { equalFieldValues } from '../data/field-values.js';
import { transformField } from '../data/form-fields.js';
import { normalizeError } from '../data/errors.js';

export const methods = {
  _clearUniqueError: function (element) {
    if (!this._uniqueMessages) return;
    const message = this._uniqueMessages.get(element);
    if (message && element.validationMessage === message)
      element.setCustomValidity('');
    this._uniqueMessages.delete(element);
  },
  _validateUniqueField: function (element) {
    if (element.getAttribute('data-unique') !== 'true') return;
    this._clearUniqueError(element);
    if (element.validity && element.validity.customError) return;
    const field = (this._dialogFieldDefinitions || []).find(
      (item) => String(item.name) === element.name
    );
    if (!field) return;
    const api = this.api();
    const row =
      this._dialogContext && this._dialogContext.action === 'edit'
        ? this._resolveSnapshotRow(this._editSnapshot)
        : null;
    const editIndex = row ? row.index() : null;
    const indexes = api.rows().indexes().toArray();
    const readColumn = field.index !== undefined && !field.getValue;
    const storedValues = readColumn
      ? api.column(field.index).data().toArray()
      : api.rows().data().toArray();
    let message;
    try {
      const currentValue = $(element).val();
      const duplicate = storedValues.some((value, index) => {
        if (indexes[index] === editIndex) return false;
        const comparable = readColumn
          ? value
          : transformField(
              field,
              'getValue',
              this._getValueByPath(value, field.name),
              this,
              'edit',
              value
            );
        return equalFieldValues(currentValue, comparable, field.type);
      });
      if (duplicate) message = field.uniqueMsg || this.language.error.unique;
    } catch (error) {
      message =
        normalizeError(error, this.language.error).message ||
        this.language.error.validation;
    }
    if (message) {
      if (!this._uniqueMessages) this._uniqueMessages = new WeakMap();
      this._uniqueMessages.set(element, message);
      element.setCustomValidity(message);
    }
  },
};

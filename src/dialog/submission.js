import { validateFields } from '../data/validation.js';
import { $ } from '../core/dependencies.js';
import { emit } from '../core/events.js';
import { resolveRow } from '../data/row-data.js';
import {
  acceptPersistedRow,
  invokePersistence,
  parsePersistedRow,
} from '../data/persistence.js';
import {
  feedbackControl,
  showFieldErrors,
  clearFieldErrors,
} from './field-feedback.js';
import { withValue, withValues } from '../data/path.js';
import { transformField } from '../data/form-fields.js';
import { normalizeError } from '../data/errors.js';

/** @callback PersistenceCallback
 * @param {Object} editor AltEditor instance.
 * @param {Object|Array} rowData Submitted values; deletion receives an array of rows.
 * @param {Function} success Accept an optional persisted row.
 * @param {Function} error Reject with an error.
 * @param {Object|Array} [originalRowData] Original row for editing.
 */
export const methods = {
  _errorCallback: function (response) {
    showFieldErrors(this, response);
    this._setDialogSubmitting(false);
  },
  _normalizeResponseData: parsePersistedRow,
  _addRowData: function () {
    return this._submitDialog('add');
  },
  _editRowData: function () {
    return this._submitDialog('edit');
  },
  _deleteRow: function () {
    return this._submitDialog('delete');
  },
  _submitDialog: function (action) {
    if (
      !this._dialogOpen ||
      this._closing ||
      this._destroyed ||
      this._submitting ||
      this._completed
    )
      return;
    const editor = this;
    const snapshot =
      action === 'edit'
        ? this._editSnapshot
        : action === 'delete'
          ? this._deleteSnapshot
          : null;
    const token = this._dialogToken;
    const active = () => !editor._destroyed && token === editor._dialogToken;
    const payload = {
      action,
      mode: 'dialog',
      row: snapshot && snapshot.originalData,
      rows: snapshot && snapshot.rows,
    };
    const fail = (error) => {
      if (active()) {
        editor._errorCallback(error);
        emit(editor, 'error', Object.assign({}, payload, { error }));
      }
    };
    if (action !== 'add' && !snapshot) {
      fail(new Error(this.language.error.targetUnavailable));
      return;
    }
    clearFieldErrors(this);
    const form = $(this.modal_selector).find('form');
    if (!active()) return;
    const columns = action === 'delete' ? [] : editor.columnDefs;
    const fieldNames = new Set();
    let validators = [];
    let collection;
    try {
      this._setDialogSubmitting(true);
      if (action === 'delete')
        collection = Promise.resolve(snapshot.rows.slice());
      else {
        const nativeErrors = Object.create(null);
        editor._validateFormData(form, nativeErrors);
        if (!active()) return;
        if (Object.keys(nativeErrors).length)
          throw { fieldErrors: nativeErrors };
        const controlsByName = new Map();
        form.find('input, select, textarea').each(function () {
          const name = this.name || this.id;
          if (name && !controlsByName.has(name)) controlsByName.set(name, this);
          if (
            !this.disabled &&
            this.name &&
            (this.type !== 'radio' || this.checked) &&
            (this.type !== 'file' || this.files.length)
          )
            fieldNames.add(this.name);
        });
        const modal = $(editor.modal_selector)[0];
        validators = columns.filter((field) => {
          if (
            typeof field.editorValidate !== 'function' ||
            field.readonly ||
            field.visible === false ||
            field.editable === false ||
            !fieldNames.has(String(field.name))
          )
            return false;
          return feedbackControl(controlsByName.get(String(field.name)), modal);
        });
        collection = this._collectFormData(form);
      }
    } catch (error) {
      fail(error);
      return;
    }
    return collection
      .then((values) => {
        if (!active()) return;
        const fields = validators.map((field) => ({
          name: field.name,
          validate: field.editorValidate,
          value: editor._getValueByPath(values, field.name),
        }));
        const validation = validateFields(
          fields,
          editor,
          values,
          snapshot && snapshot.originalData,
          action,
          active
        );
        return Promise.resolve(validation).then((error) => {
          if (error) throw error;
          if (action !== 'delete' && active()) {
            let converted = values;
            columns.forEach((field) => {
              if (
                !active() ||
                field.setValue === undefined ||
                !fieldNames.has(String(field.name))
              )
                return;
              try {
                converted = withValue(
                  converted,
                  field.name,
                  transformField(
                    field,
                    'setValue',
                    editor._getValueByPath(values, field.name),
                    editor,
                    action,
                    snapshot && snapshot.originalData,
                    values
                  )
                );
              } catch (error) {
                throw {
                  fieldErrors: {
                    [field.name]:
                      normalizeError(error, editor.language.error).message ||
                      editor.language.error.validation,
                  },
                };
              }
            });
            return converted;
          }
          return values;
        });
      })
      .then((values) => {
        if (!active()) return;
        payload.values = values;
        if (!emit(editor, 'pre-submit', payload)) {
          editor._setDialogSubmitting(false);
          return;
        }
        if (!active()) return;
        if (action === 'edit' && !resolveRow(editor.api(), snapshot))
          throw new Error(editor.language.error.targetUnavailable);
        if (
          action === 'delete' &&
          snapshot.targets.some((target) => !resolveRow(editor.api(), target))
        )
          throw new Error(editor.language.error.targetUnavailable);
        emit(editor, 'submit', payload);
        if (!active()) return;
        const candidate =
          action === 'edit'
            ? withValues(
                snapshot.originalData,
                Array.from(fieldNames, (name) => [
                  name,
                  editor._getValueByPath(values, name),
                ])
              )
            : values;
        const callback =
          editor[
            action === 'add'
              ? 'onAddRow'
              : action === 'edit'
                ? 'onEditRow'
                : 'onDeleteRow'
          ];
        invokePersistence(
          callback,
          editor,
          values,
          action === 'edit' ? [snapshot.originalData] : [],
          (response) => {
            if (!active()) return;
            try {
              const api = editor.api();
              if (action === 'delete') {
                const rows = snapshot.targets.map((target) =>
                  resolveRow(api, target)
                );
                if (rows.some((row) => !row))
                  throw new Error(editor.language.error.targetUnavailable);
                api.rows(rows.map((row) => row.index())).remove();
              } else {
                const data = acceptPersistedRow(
                  response === values ? undefined : response,
                  candidate,
                  editor.language.error.invalidResponse
                );
                if (action === 'add') api.row.add(data);
                else {
                  const row = resolveRow(api, snapshot);
                  if (!row)
                    throw new Error(editor.language.error.targetUnavailable);
                  row.data(data);
                }
              }
              api.draw(false);
              if (!active()) return;
              editor._completed = true;
              editor._setDialogSubmitting(false);
              emit(editor, 'success', payload);
              if (active()) editor._completeSuccessfulSubmit();
            } catch (error) {
              fail(error);
            }
          },
          fail
        );
      })
      .catch(fail);
  },
};

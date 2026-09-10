import { $ } from '../core/dependencies.js';
import { emit } from '../core/events.js';
import { invoke, resolveRow } from '../data/row-data.js';
import { withValue } from '../data/path.js';

/** @callback PersistenceCallback
 * @param {Object} editor AltEditor instance.
 * @param {Object|Array} rowData Submitted values; deletion receives an array of rows.
 * @param {Function} success Accept an optional persisted row.
 * @param {Function} error Reject with an error.
 * @param {Object|Array} [originalRowData] Original row for editing.
 */
export const methods = {
  _errorCallback: function (response, status, more) {
    var error = response || {};
    var message =
      typeof response === 'string' ? response : this.language.error.message;

    if (error instanceof Error && error.message) {
      message = error.message;
    } else if (error.responseJSON && error.responseJSON.errors) {
      var messages = [];
      Object.keys(error.responseJSON.errors).forEach(function (key) {
        var value = error.responseJSON.errors[key];
        if (Array.isArray(value)) {
          value.forEach(function (item) {
            if (item !== null && item !== undefined)
              messages.push(String(item));
          });
        } else if (value !== null && value !== undefined) {
          messages.push(String(value));
        }
      });
      if (messages.length) message = messages.join('\n');
    } else if (error.responseText) {
      message = String(error.responseText);
    } else if (error.status !== null && error.status !== undefined) {
      message = this.language.error.responseCode + error.status;
    }

    this._showErrorMessage(message);
    this._setDialogSubmitting(false);
  },
  _normalizeResponseData: function (response) {
    if (typeof response !== 'string') return response;
    var trimmed = response.trim();
    if (!trimmed) return response;
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      try {
        return JSON.parse(trimmed);
      } catch (_error) {
        return response;
      }
    }
    return response;
  },
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
    if (this._destroyed || this._submitting || this._completed) return;
    const editor = this;
    const snapshot =
      action === 'edit' ? this._editSnapshot : this._deleteSnapshot;
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
    const form = $(this.modal_selector).find('form');
    const errors = this._validateFormData(form);
    if (errors.length) {
      fail(new Error(errors.join('\n')));
      return;
    }
    this._setDialogSubmitting(true);
    let collection;
    try {
      collection =
        action === 'delete'
          ? Promise.resolve(snapshot.rows.slice())
          : this._collectFormData(form);
    } catch (error) {
      fail(error);
      return;
    }
    return collection
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
        const callback =
          editor[
            action === 'add'
              ? 'onAddRow'
              : action === 'edit'
                ? 'onEditRow'
                : 'onDeleteRow'
          ];
        invoke(
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
                let candidate =
                  action === 'edit' ? snapshot.originalData : values;
                if (action === 'edit') {
                  form.find('input, select, textarea').each(function () {
                    if (
                      !this.disabled &&
                      this.name &&
                      (this.type !== 'radio' || this.checked) &&
                      (this.type !== 'file' || this.files.length)
                    )
                      candidate = withValue(
                        candidate,
                        this.name,
                        editor._getValueByPath(values, this.name)
                      );
                  });
                }
                const data =
                  response === undefined || response === values
                    ? candidate
                    : editor._normalizeResponseData(response);
                if (!data || typeof data !== 'object')
                  throw new Error(editor.language.error.invalidResponse);
                if (action === 'add') api.row.add(data);
                else {
                  const row = resolveRow(api, snapshot);
                  if (!row)
                    throw new Error(editor.language.error.targetUnavailable);
                  row.data(data);
                }
              }
              api.draw(false);
              editor._completed = true;
              editor._setDialogSubmitting(false);
              emit(editor, 'success', payload);
              editor._completeSuccessfulSubmit();
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

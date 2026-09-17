import { $ } from '../core/dependencies.js';
import { emit } from '../core/events.js';
import { invoke, resolveRow } from '../data/row-data.js';
import { showFieldErrors, clearFieldErrors } from '../dialog/field-feedback.js';
import { withValue } from '../data/path.js';

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
    const errors = this._validateFormData(form);
    if (errors.length) {
      fail(new Error(errors.join('\n')));
      return;
    }
    if (!active()) return;
    const fieldNames = form
      .find('input, select, textarea')
      .filter(function () {
        return (
          !this.disabled &&
          this.name &&
          (this.type !== 'radio' || this.checked) &&
          (this.type !== 'file' || this.files.length)
        );
      })
      .map(function () {
        return this.name;
      })
      .get();
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
        if (!active()) return;
        let candidate = action === 'edit' ? snapshot.originalData : values;
        if (action === 'edit')
          fieldNames.forEach((name) => {
            candidate = withValue(
              candidate,
              name,
              editor._getValueByPath(values, name)
            );
          });
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

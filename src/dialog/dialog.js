import { clearFieldErrors } from './field-feedback.js';
import { deletionContent } from './template.js';
import {
  createDialogShell,
  configureDialogFramework,
  renderDialog,
} from './dialog-view.js';
import { bindDialogEvents } from './adapters/events.js';
import { selectAdapter } from './adapters/index.js';
import { emit } from '../core/events.js';
import { resolveLanguage } from '../core/language.js';
import { $, document } from '../core/dependencies.js';
import { snapshotRow, cloneRow } from '../data/row-data.js';
import { equalFieldValues } from '../data/field-values.js';
export const methods = {
  _prepareDialog: function () {
    if (
      this._destroyed ||
      this._opening ||
      this._closing ||
      this._submitting ||
      (this._inline &&
        this._inline.session &&
        this._inline.session.state === 'submitting')
    )
      return false;
    if (this._inline) this._inline.cancel('dialog', false);
    return !this._destroyed;
  },
  _beginDialog: function (action, rows) {
    const previousContext = this._dialogContext;
    this._opening = true;
    this._dialogContext = {
      editor: this,
      action,
      mode: 'dialog',
      rows: rows.map((row) => cloneRow(row)),
    };
    try {
      if (
        !this._notifyDialog('before-open', 'onBeforeOpen') ||
        this._destroyed
      ) {
        this._opening = false;
        this._dialogContext = previousContext;
        return false;
      }
      return true;
    } catch (error) {
      this._opening = false;
      this._dialogContext = previousContext;
      emit(this, 'error', { action: 'open', mode: 'dialog', error });
      return false;
    }
  },
  _resolveOpeningRows: function (targets) {
    const rows = targets.map((target) => this._resolveSnapshotRow(target));
    if (rows.some((row) => !row)) {
      this._opening = false;
      this._dialogContext = null;
      const error = new Error(this.language.error.targetUnavailable);
      this._showErrorMessage(error.message);
      emit(this, 'error', { action: 'open', mode: 'dialog', error });
      return null;
    }
    this._dialogContext.rows = rows.map((row) => cloneRow(row.data()));
    return rows;
  },
  _notifyDialog: function (name, callbackName, extra) {
    const detail = Object.assign({}, this._dialogContext, extra);
    const accepted = emit(this, name, detail);
    if (this._destroyed) return false;
    const callback = this.c.dialog[callbackName];
    const result =
      typeof callback === 'function' ? callback(detail) : undefined;
    if (result && typeof result.then === 'function')
      throw new TypeError('Dialog lifecycle callbacks must be synchronous');
    return result !== false && accepted;
  },
  _bindDialog: function (action) {
    if (this._destroyed) {
      this._opening = false;
      return;
    }
    if (this._message) this._message.empty();
    this._action = action;
    this._completed = false;
    this._dialogOpen = true;
    this._dialogToken = {};
    const editor = this;
    $(this.modal_selector)
      .find('form')
      .off('submit' + this.s.modalNamespace)
      .on('submit' + this.s.modalNamespace, function (event) {
        event.preventDefault();
        editor[
          action === 'add'
            ? '_addRowData'
            : action === 'edit'
              ? '_editRowData'
              : '_deleteRow'
        ]();
      });
    try {
      this._notifyDialog('dialog-render', 'onRender', {
        dialog: $(this.modal_selector)[0],
        form: $(this.modal_selector).find('form')[0],
      });
    } catch (error) {
      emit(this, 'error', { action, mode: 'dialog', error });
    }
    this._opening = false;
    if (!this._destroyed && this._dialogOpen)
      emit(this, 'open', Object.assign({}, this._dialogContext));
  },
  internalOpenDialog: function (selector, fill) {
    this._returnFocus = document.activeElement;
    const framework = this.c.dialog.framework;
    const element = $(selector)[0];
    try {
      const selected = selectAdapter(framework, element);
      if (!selected)
        throw new Error(
          framework === 'native'
            ? this.language.error.nativeDialog
            : this.language.error.dialogFramework
        );
      this._adapter = selected.api;
      this._cleanupPlugins();
      fill();
      if (this._destroyed) {
        this._opening = false;
        return false;
      }
      configureDialogFramework(
        $(element),
        selected.name,
        framework === 'foundation'
      );
      this._dialogShown = true;
      selected.api.show(element);
    } catch (error) {
      return this._abortDialogOpening(error);
    }
  },
  _abortDialogOpening: function (error) {
    if (this._destroyed) return false;
    this._opening = false;
    this._dialogOpen = false;
    this._dialogToken = {};
    this._dialogContext = null;
    this._editSnapshot = null;
    this._deleteSnapshot = null;
    this._cleanupPlugins();
    if (this._adapter && this._dialogShown)
      this.internalCloseDialog(this.modal_selector);
    this._showErrorMessage(error.message);
    emit(this, 'error', { action: 'open', mode: 'dialog', error });
    return false;
  },
  internalCloseDialog: function (selector) {
    if (this._adapter) {
      this._closing = true;
      this._adapter.hide($(selector)[0]);
    }
  },

  _handleDialogClosed: function () {
    this._closing = false;
    this._dialogShown = false;
    if (!this._dialogOpen) return;
    this._dialogOpen = false;
    this._dialogToken = {};
    clearFieldErrors(this);
    this._cleanupPlugins();
    this._removeModalEvents(this.modal_selector);
    this._editSnapshot = null;
    this._deleteSnapshot = null;
    this._setDialogSubmitting(false);
    if (this._returnFocus && this._returnFocus.isConnected)
      this._returnFocus.focus();
    const context = this._dialogContext;
    try {
      this._notifyDialog('close', 'onClose');
    } catch (error) {
      emit(this, 'error', { action: this._action, mode: 'dialog', error });
    } finally {
      if (this._dialogContext === context) this._dialogContext = null;
    }
  },
  _setup: function () {
    var that = this;
    var dt = this.s.dt;
    if (this._destroyed) return;

    this.random_id = this.s.namespace.slice(1);
    var modalId = 'altEditor-modal-' + this.random_id;
    this.modal_selector = '#' + modalId;

    const useNative = this.c.dialog.framework === 'native';
    var modal = createDialogShell(modalId, useNative, this.language.modalClose);
    document.body.appendChild(modal);

    var $modal = $(this.modal_selector);
    bindDialogEvents(this, $modal);

    if (typeof dt.button === 'function') {
      ['add', 'edit', 'delete', 'refresh'].forEach(function (name) {
        const button = dt.button(name + ':name');
        if (!button || !button.count()) return;
        const original = button.action();
        const action = function () {
          if (name === 'refresh') that.refresh();
          else
            that[
              name === 'add'
                ? 'openAddDialog'
                : name === 'edit'
                  ? 'openEditDialog'
                  : 'openDeleteDialog'
            ]();
        };
        that._buttonActions.push({ name, original, action });
        button.action(action);
      });
    }

    var checkUnique = function (event) {
      var target = $(event.target);
      if (target.attr('data-unique') !== 'true') return;
      var column = (that.columnDefs || []).find(
        (item) => String(item.name) === target.attr('name')
      );
      if (!column) {
        event.target.setCustomValidity('');
        return;
      }

      var candidate = target.val();
      var formName = target.closest('form').attr('name') || '';
      var editRow =
        formName.indexOf('altEditor-edit-form-') === 0
          ? that._resolveSnapshotRow(that._editSnapshot)
          : null;
      var editIndex = editRow ? editRow.index() : null;
      var rowIndexes = dt.rows().indexes().toArray();

      event.target.setCustomValidity('');
      var values = dt.column(column.index).data().toArray();
      var duplicate = values.some(function (value, index) {
        var rowIndex = rowIndexes[index];
        if (editIndex !== null && rowIndex === editIndex) return false;
        return equalFieldValues(candidate, value, column.type);
      });
      if (duplicate)
        event.target.setCustomValidity(
          column.uniqueMsg || that.language.error.unique
        );
    };

    $modal.on(
      'input' + this.s.namespace + ' change' + this.s.namespace,
      'input, select, textarea',
      function () {
        clearFieldErrors(that, this.name);
      }
    );
    $modal.on('input' + this.s.namespace, '[data-unique]', checkUnique);
    $modal.on('change' + this.s.namespace, 'select[data-unique]', checkUnique);
  },
  _initLanguage: function (source) {
    const language = resolveLanguage(
      source === undefined ? this.language : source
    );
    this.language = language;
    $(this.modal_selector)
      .find('.altEditor-close')
      .attr('aria-label', this.language.modalClose);
    if (this._dialogOpen) {
      const modal = $(this.modal_selector);
      modal.find('.altEditor-title').text(this.language[this._action].title);
      modal
        .find('.altEditor-footer [type="submit"]')
        .text(this.language[this._action].button);
      modal
        .find('.altEditor-footer [type="button"]')
        .text(this.language.modalClose);
      modal.find('.altEditor-delete-message').text(this.language.deleteMessage);
    }
  },
  /** Open the edit dialog.
   * @param {*} [rowSelector] Explicit DataTables row selector; otherwise use selected rows.
   */
  openEditDialog: function (rowSelector) {
    if (!this._prepareDialog()) return false;
    var dt = this.s.dt;
    var selectedRows = this._selectedRows(rowSelector);
    if (!selectedRows || selectedRows.count() !== 1) {
      this._showErrorMessage(this.language.error.editSelection);
      return false;
    }

    var rowIndex = selectedRows.indexes().toArray()[0];
    var rowData = selectedRows.data()[0];
    if (rowIndex === undefined || rowData === undefined) return false;

    const target = snapshotRow(dt.row(rowIndex));
    if (!this._beginDialog('edit', [rowData])) return false;
    const rows = this._resolveOpeningRows([target]);
    if (!rows) return false;
    this._editSnapshot = snapshotRow(rows[0]);
    rowData = rows[0].data();

    return this._openFormDialog('edit', rowData);
  },
  /** Open the delete dialog.
   * @param {*} [rowSelector] Explicit DataTables row selector; otherwise use selected rows.
   */
  openDeleteDialog: function (rowSelector) {
    if (!this._prepareDialog()) return false;
    var selectedRows = this._selectedRows(rowSelector);
    if (!selectedRows || selectedRows.count() === 0) {
      this._showErrorMessage(this.language.error.deleteSelection);
      return false;
    }

    const targets = selectedRows
      .indexes()
      .toArray()
      .map((index) => snapshotRow(this.s.dt.row(index)));
    if (!this._beginDialog('delete', selectedRows.data().toArray()))
      return false;
    const rows = this._resolveOpeningRows(targets);
    if (!rows) return false;
    this._deleteSnapshot = {
      rowIndexes: rows.map((row) => row.index()),
      rows: rows.map((row) => row.data()),
      rowNodes: rows.map((row) => row.node()),
      targets: rows.map((row) => snapshotRow(row)),
    };

    var selector = this.modal_selector;
    var formName = 'altEditor-delete-form-' + this.random_id;
    var that = this;
    var fill = function () {
      clearFieldErrors(that);
      const body = $('<div/>').append(
        $('<p/>', { class: 'altEditor-delete-message' }).text(
          that.language.deleteMessage
        )
      );
      const details = deletionContent(
        that.c.dialog.deleteDetails,
        that._dialogContext
      );
      if (details)
        body.append(
          $('<div/>', { class: 'altEditor-delete-details' }).append(details)
        );
      renderDialog($(selector), {
        title: that.language.delete.title,
        body,
        closeCaption: that.language.modalClose,
        buttonCaption: that.language.delete.button,
        buttonId: 'deleteRowBtn',
        formName,
        destructive: true,
      });
    };

    if (this.internalOpenDialog(selector, fill) === false) return false;
    this._finishDialogOpening('delete');
  },
  /** Open the add dialog. */
  openAddDialog: function () {
    if (!this._prepareDialog()) return false;
    if (!this._beginDialog('add', [])) return false;
    return this._openFormDialog('add');
  },
  _finishDialogOpening: function (action) {
    if (this._destroyed) return;
    this._focusFirstInput();
    $(this.modal_selector)
      .trigger('alteditor:some_dialog_opened')
      .trigger('alteditor:' + action + '_dialog_opened');
    this._bindDialog(action);
  },
  _removeModalEvents: function (modal) {
    var $modal = modal && modal.jquery ? modal : $(modal);
    if ($modal.length) $modal.off(this.s.modalNamespace);
  },
  _focusFirstInput: function () {
    if (!this.modal_selector) return;
    var $target = $(this.modal_selector)
      .find('input, select, textarea')
      .filter(':visible:enabled')
      .first();
    if (!$target.length)
      $target = $(this.modal_selector)
        .find('button')
        .filter(':visible:enabled')
        .first();
    if ($target.length) $target.trigger('focus');
  },
  _setDialogSubmitting: function (submitting) {
    this._submitting = !!submitting;
    if (!this.modal_selector) return;
    var $modal = $(this.modal_selector);
    $modal
      .find('button[type="submit"]')
      .prop('disabled', this._submitting)
      .attr('aria-busy', this._submitting ? 'true' : 'false');
    $modal
      .find(
        'button[data-dismiss="modal"], button[data-close], .altEditor-close, [data-alteditor-close]'
      )
      .prop('disabled', this._submitting);
  },
  _completeSuccessfulSubmit: function () {
    if (this.closeModalOnSuccess) {
      this.internalCloseDialog(this.modal_selector);
    } else {
      this._setDialogSubmitting(false);
      this._showSuccessMessage();
      $(this.modal_selector)
        .find('button[type="submit"]')
        .prop('disabled', true);
    }
  },
  _showSuccessMessage: function () {
    var $body = $(this.modal_selector).find('.altEditor-body');
    $body.find('.altEditor-feedback').remove();
    var $alert = $('<div/>', {
      class: $(this.modal_selector).is('dialog')
        ? 'altEditor-feedback'
        : 'altEditor-feedback alert alert-success',
      role: 'alert',
    });
    $('<strong/>').text(this.language.success).appendTo($alert);
    $body.append($alert);
  },
  _showErrorMessage: function (message) {
    if (!this.modal_selector || !$(this.modal_selector).length) {
      if (message) console.error(message);
      return;
    }
    var $body = $(this.modal_selector).find('.altEditor-body');
    if (!this._dialogOpen) {
      if (!this._message)
        this._message = $('<div/>', {
          class: 'altEditor-message',
        }).insertBefore(this.api().table().node());
      $body = this._message;
    }
    $body.find('.altEditor-feedback').remove();
    var $alert = $('<div/>', {
      class: $(this.modal_selector).is('dialog')
        ? 'altEditor-feedback'
        : 'altEditor-feedback alert alert-danger',
      role: 'alert',
    });
    $('<strong/>').text(this.language.error.label).appendTo($alert);
    if (message) {
      $('<br/>').appendTo($alert);
      $('<span/>')
        .css('white-space', 'pre-line')
        .text(String(message))
        .appendTo($alert);
    }
    $body.append($alert);
  },
};

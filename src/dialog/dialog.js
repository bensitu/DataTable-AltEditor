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
import { requireSynchronousResult } from '../core/synchronous-result.js';
import { $, document } from '../core/dependencies.js';
import { snapshotRow, cloneRow } from '../data/row-data.js';
import { cancelPersistence } from '../data/persistence.js';
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
  _resolveOpeningRows: function (targets, previousContext) {
    const rows = targets.map((target) => this._resolveSnapshotRow(target));
    if (rows.some((row) => !row)) {
      this._opening = false;
      this._dialogContext = previousContext || null;
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
    return (
      requireSynchronousResult(
        result,
        'Dialog lifecycle callbacks must be synchronous'
      ) !== false && accepted
    );
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
      try {
        selected.api.show(element);
      } catch (error) {
        this._dialogShown = false;
        try {
          selected.api.dispose(element);
        } catch (cleanupError) {
          if (this.debug)
            console.warn(
              'AltEditor could not release the dialog',
              cleanupError
            );
        }
        this._closing = false;
        throw error;
      }
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
    this._abortFileReads();
    cancelPersistence(this);
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
    const editor = this;
    if (this._destroyed) return;

    const modalId = 'altEditor-modal-' + this._instanceId;
    this.modal_selector = '#' + modalId;

    const useNative = this.c.dialog.framework === 'native';
    const modal = createDialogShell(
      modalId,
      useNative,
      this.language.modalClose
    );
    document.body.appendChild(modal);

    const $modal = $(modal);
    bindDialogEvents(this, $modal);

    $modal.on(
      'input' + this.s.namespace + ' change' + this.s.namespace,
      'input, select, textarea',
      function () {
        clearFieldErrors(editor, this.name);
      }
    );
    $modal.on('input' + this.s.namespace, '[data-unique]', function () {
      editor._clearUniqueError(this);
    });
    $modal.on('change' + this.s.namespace, '[data-unique]', function () {
      editor._validateUniqueField(this);
    });
  },
  _initLanguage: function (source) {
    const language = resolveLanguage(
      source === undefined ? this.language : source
    );
    this.language = language;
    const modal = $(this.modal_selector);
    modal.find('.altEditor-close').attr('aria-label', this.language.modalClose);
    if (this._dialogOpen) {
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
    const previousContext = this._dialogContext;
    if (!this._beginDialog('edit', [rowData])) return false;
    const rows = this._resolveOpeningRows([target], previousContext);
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
    const previousContext = this._dialogContext;
    if (!this._beginDialog('delete', selectedRows.data().toArray()))
      return false;
    const rows = this._resolveOpeningRows(targets, previousContext);
    if (!rows) return false;
    this._deleteSnapshot = {
      rows: rows.map((row) => row.data()),
      targets: rows.map((row) => snapshotRow(row)),
    };

    var selector = this.modal_selector;
    var formName = 'altEditor-delete-form-' + this._instanceId;
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
    if ($modal.length) {
      $modal.off(this.s.modalNamespace);
      $modal.find('form').off(this.s.modalNamespace);
    }
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
    $modal.find('form').attr('aria-busy', this._submitting ? 'true' : 'false');
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
};

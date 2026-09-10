import { emit } from '../core/events.js';
import { mergeOptions, isPlainObject } from '../core/options.js';
import { $, root as window, document } from '../core/dependencies.js';
import { snapshotRow } from '../data/row-data.js';
import { fieldElement, equalFieldValues } from '../data/field-values.js';
export const methods = {
  _setup: function () {
    var that = this;
    var dt = this.s.dt;
    if (this._destroyed) return;

    this.random_id = this.s.namespace.slice(1);
    var modalId = 'altEditor-modal-' + this.random_id;
    var titleId = modalId + '-title';
    var bodyId = modalId + '-body';
    this.modal_selector = '#' + modalId;

    this._initLanguage();

    var modal = document.createElement('div');
    modal.className = 'modal fade altEditor-modal reveal';
    modal.style.display = 'none';
    modal.id = modalId;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', titleId);
    modal.setAttribute('aria-describedby', bodyId);
    modal.setAttribute('data-backdrop', 'static');
    modal.setAttribute('data-keyboard', 'false');
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.setAttribute('data-bs-keyboard', 'false');
    modal.setAttribute('data-reveal', '');
    modal.tabIndex = -1;

    var dialog = document.createElement('div');
    dialog.className = 'modal-dialog modal-lg';
    var content = document.createElement('div');
    content.className = 'modal-content';
    var header = document.createElement('div');
    header.className = 'modal-header';
    var title = document.createElement('h4');
    title.className = 'modal-title';
    title.id = titleId;
    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'altEditor-close';
    closeButton.setAttribute('data-dismiss', 'modal');
    closeButton.setAttribute('data-bs-dismiss', 'modal');
    closeButton.setAttribute('data-close', '');
    closeButton.setAttribute('aria-label', this.language.modalClose);
    var closeGlyph = document.createElement('span');
    closeGlyph.setAttribute('aria-hidden', 'true');
    closeGlyph.textContent = '×';
    closeButton.appendChild(closeGlyph);
    header.appendChild(title);
    header.appendChild(closeButton);

    var body = document.createElement('div');
    body.className = 'modal-body';
    body.id = bodyId;
    var footer = document.createElement('div');
    footer.className = 'modal-footer';

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    dialog.appendChild(content);
    modal.appendChild(dialog);
    document.body.appendChild(modal);

    var $modal = $(this.modal_selector);
    $modal.on(
      'shown.bs.modal' +
        this.s.namespace +
        ' open.zf.reveal' +
        this.s.namespace,
      function () {
        that._focusFirstInput();
      }
    );
    $modal.on('submit' + this.s.namespace, 'form', function (event) {
      event.preventDefault();
    });
    var cleanupDialog = function () {
      if (!that._dialogOpen) return;
      that._dialogOpen = false;
      that._dialogToken = {};
      that._cleanupPlugins();
      that._removeModalEvents(this);
      that._editSnapshot = null;
      that._deleteSnapshot = null;
      that._setDialogSubmitting(false);
      if (that._returnFocus && that._returnFocus.isConnected)
        that._returnFocus.focus();
      emit(that, 'close', { action: that._action, mode: 'dialog' });
    };
    $modal.on('hidden.bs.modal' + this.s.namespace, cleanupDialog);
    $modal.on('hide.bs.modal' + this.s.namespace, function (event) {
      if (that._submitting && !that._destroyed) event.preventDefault();
    });
    $modal.on('closed.zf.reveal' + this.s.namespace, function () {
      cleanupDialog.call(this);
    });

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
      var duplicate = rowIndexes.some(function (rowIndex) {
        if (editIndex !== null && rowIndex === editIndex) return false;
        return equalFieldValues(
          candidate,
          dt.cell(rowIndex, column.index).data(),
          column.type
        );
      });
      if (duplicate)
        event.target.setCustomValidity(
          column.uniqueMsg || that.language.error.unique
        );
    };

    $modal.on('input' + this.s.namespace, '[data-unique]', checkUnique);
    $modal.on('change' + this.s.namespace, 'select[data-unique]', checkUnique);
  },
  _initLanguage: function (source) {
    var defaults = {
      modalClose: 'Close',
      edit: { title: 'Edit record', button: 'Edit' },
      delete: { title: 'Delete record', button: 'Delete' },
      add: { title: 'Add record', button: 'Add' },
      deleteMessage: 'Are you sure you wish to delete the selected row(s)?',
      success: 'Success!',
      error: {
        message: 'There was an unknown error!',
        label: 'Error!',
        responseCode: 'Response code: ',
        required: 'Field is required',
        unique: 'Duplicated field',
      },
    };

    const input = source === undefined ? this.language : source;
    if (!isPlainObject(input))
      throw new TypeError('Language configuration must be an object');
    const language = mergeOptions(defaults, input);
    const validate = (expected, actual) =>
      Object.keys(expected).every((key) =>
        typeof expected[key] === 'string'
          ? typeof actual[key] === 'string'
          : isPlainObject(actual[key]) && validate(expected[key], actual[key])
      );
    if (!validate(defaults, language))
      throw new TypeError('Language values must be strings');
    this.language = language;
    $(this.modal_selector)
      .find('.altEditor-close')
      .attr('aria-label', this.language.modalClose);
    if (this._dialogOpen) {
      const modal = $(this.modal_selector);
      modal.find('.modal-title').text(this.language[this._action].title);
      modal
        .find('.modal-footer [type="submit"]')
        .text(this.language[this._action].button);
      modal
        .find('.modal-footer [type="button"]')
        .text(this.language.modalClose);
      modal.find('.altEditor-delete-message').text(this.language.deleteMessage);
    }
  },
  /** Open the edit dialog.
   * @param {*} [rowSelector] Explicit DataTables row selector; otherwise use selected rows.
   */
  openEditDialog: function (rowSelector) {
    if (
      this._destroyed ||
      this._submitting ||
      (this._inline &&
        this._inline.session &&
        this._inline.session.state === 'submitting')
    )
      return false;
    if (this._inline) this._inline.cancel('dialog', false);
    this._cleanupPlugins();
    var dt = this.s.dt;
    var selectedRows = this._selectedRows(rowSelector);
    if (!selectedRows || selectedRows.count() !== 1) {
      this._showErrorMessage('Exactly one row must be selected for editing.');
      return false;
    }

    var rowIndex = selectedRows.indexes().toArray()[0];
    var rowData = selectedRows.data()[0];
    if (rowIndex === undefined || rowData === undefined) return;

    this._editSnapshot = snapshotRow(dt.row(rowIndex));

    var columnDefs = this.completeColumnDefs();
    this.createDialog(
      columnDefs,
      this.language.edit.title,
      this.language.edit.button,
      this.language.modalClose,
      'editRowBtn',
      'altEditor-edit-form'
    );

    var that = this;
    columnDefs.forEach(function (columnDef) {
      if (
        typeof columnDef.name !== 'number' &&
        typeof columnDef.name !== 'string'
      )
        return;
      if (
        columnDef.name === null ||
        columnDef.name === undefined ||
        columnDef.editable === false
      )
        return;
      var $element = fieldElement(that.modal_selector, columnDef.name).filter(
        ':input[type!="file"]'
      );
      if (!$element.length) return;
      var value = that._getValueByPath(rowData, columnDef.name);
      that._setFieldValue($element, columnDef, value);
      $element.trigger('change');
    });

    this._focusFirstInput();
    $(this.modal_selector)
      .trigger('alteditor:some_dialog_opened')
      .trigger('alteditor:edit_dialog_opened');
    this._bindDialog('edit');
  },
  /** Open the delete dialog.
   * @param {*} [rowSelector] Explicit DataTables row selector; otherwise use selected rows.
   */
  openDeleteDialog: function (rowSelector) {
    if (
      this._destroyed ||
      this._submitting ||
      (this._inline &&
        this._inline.session &&
        this._inline.session.state === 'submitting')
    )
      return false;
    if (this._inline) this._inline.cancel('dialog', false);
    this._cleanupPlugins();
    var selectedRows = this._selectedRows(rowSelector);
    if (!selectedRows || selectedRows.count() === 0) {
      this._showErrorMessage('At least one row must be selected for deletion.');
      return false;
    }

    this._deleteSnapshot = {
      rowIndexes: selectedRows.indexes().toArray(),
      rows: selectedRows.data().toArray(),
      rowNodes: selectedRows.nodes().toArray(),
      targets: selectedRows
        .indexes()
        .toArray()
        .map((index) => snapshotRow(this.s.dt.row(index))),
    };

    var selector = this.modal_selector;
    var formName = 'altEditor-delete-form-' + this.random_id;
    var that = this;
    var fill = function () {
      var $modal = $(selector);
      $modal.find('.modal-title').text(that.language.delete.title);
      $modal
        .find('.modal-body')
        .empty()
        .append(
          $('<p/>', { class: 'altEditor-delete-message' }).text(
            that.language.deleteMessage
          )
        );
      $modal
        .find('.modal-footer')
        .empty()
        .append(
          $('<button/>', {
            type: 'button',
            class: 'btn btn-default btn-secondary button secondary',
            'data-dismiss': 'modal',
            'data-bs-dismiss': 'modal',
            'data-close': '',
            text: that.language.modalClose,
          })
        )
        .append(
          $('<button/>', {
            type: 'submit',
            class: 'btn btn-danger button',
            id: 'deleteRowBtn',
            text: that.language.delete.button,
          })
        );

      var modalContent = $modal.find('.modal-content');
      if (modalContent.parent().is('form')) {
        modalContent.parent().attr('name', formName).attr('id', formName);
      } else {
        modalContent.wrap(
          $('<form/>', {
            name: formName,
            id: formName,
            role: 'form',
          })
        );
      }
    };

    this.internalOpenDialog(selector, fill);
    this._focusFirstInput();
    $(selector)
      .trigger('alteditor:some_dialog_opened')
      .trigger('alteditor:delete_dialog_opened');
    this._bindDialog('delete');
  },
  /** Open the add dialog.
   * @param {*} [rowSelector] Explicit DataTables row selector; otherwise use selected rows.
   */
  openAddDialog: function () {
    if (
      this._destroyed ||
      this._submitting ||
      (this._inline &&
        this._inline.session &&
        this._inline.session.state === 'submitting')
    )
      return false;
    if (this._inline) this._inline.cancel('dialog', false);
    this._cleanupPlugins();
    var columnDefs = this.completeColumnDefs();
    this.createDialog(
      columnDefs,
      this.language.add.title,
      this.language.add.button,
      this.language.modalClose,
      'addRowBtn',
      'altEditor-add-form'
    );

    var that = this;
    columnDefs.forEach(function (columnDef) {
      if (
        typeof columnDef.name !== 'number' &&
        typeof columnDef.name !== 'string'
      )
        return;
      if (
        columnDef.name === null ||
        columnDef.name === undefined ||
        columnDef.value === null ||
        columnDef.value === undefined
      )
        return;
      var $element = fieldElement(that.modal_selector, columnDef.name).filter(
        ':input[type!="file"]'
      );
      if (!$element.length) return;
      that._setFieldValue($element, columnDef, columnDef.value);
      $element.trigger('change');
    });

    this._focusFirstInput();
    $(this.modal_selector)
      .trigger('alteditor:some_dialog_opened')
      .trigger('alteditor:add_dialog_opened');
    this._bindDialog('add');
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
      .find('button[data-dismiss="modal"], button[data-close]')
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
    var $body = $(this.modal_selector).find('.modal-body');
    $body.find('.alert').remove();
    var $alert = $('<div/>', { class: 'alert alert-success', role: 'alert' });
    $('<strong/>').text(this.language.success).appendTo($alert);
    $body.append($alert);
  },
  _showErrorMessage: function (message) {
    if (!this.modal_selector || !$(this.modal_selector).length) {
      if (message) console.error(message);
      return;
    }
    var $body = $(this.modal_selector).find('.modal-body');
    if (!this._dialogOpen) {
      if (!this._message)
        this._message = $('<div/>', {
          class: 'altEditor-message',
        }).insertBefore(this.api().table().node());
      $body = this._message;
    }
    $body.find('.alert').remove();
    var $alert = $('<div/>', { class: 'alert alert-danger', role: 'alert' });
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

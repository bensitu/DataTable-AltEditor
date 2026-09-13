import { $, document } from './dependencies.js';
import { defaults, normalizeOptions } from './options.js';
import { normalizeColumns } from './columns.js';
import { emit } from './events.js';
import { readPath, writePath } from '../data/path.js';
import { resolveRow } from '../data/row-data.js';
import { methods as dialogs } from '../dialog/dialog.js';
import { methods as fields } from '../dialog/field-renderer.js';
import { methods as plugins } from '../dialog/plugins.js';
import { methods as actions } from '../crud/actions.js';
import * as bootstrap from '../dialog/adapters/bootstrap.js';
import * as foundation from '../dialog/adapters/foundation.js';
import { InlineEditor } from '../inline/inline-editor.js';
let instance = 0;
export function createAltEditor(DataTable) {
  /** Row-oriented dialog and cell editor for a DataTables instance.
   * @class
   * @param {DataTable.Api} dt Table API.
   * @param {Object} [options] Editor configuration.
   */
  function AltEditor(dt, options) {
    const api = new DataTable.Api(dt);
    const table = api.table().node();
    if (table.altEditor && !table.altEditor._destroyed) return table.altEditor;
    if (!DataTable.versionCheck('2.1') || DataTable.versionCheck('3'))
      throw new Error('AltEditor requires DataTables >=2.1.0 <3');
    this.c = normalizeOptions(
      DataTable.defaults.altEditor,
      api.init(),
      options
    );
    const id = instance++;
    this.s = {
      dt: api,
      namespace: '.altEditor' + id,
      modalNamespace: '.altEditorModal' + id,
    };
    this._destroyed = false;
    this._submitting = false;
    this._buttonActions = [];
    [
      'closeModalOnSuccess',
      'encodeFiles',
      'debug',
      'onAddRow',
      'onEditRow',
      'onDeleteRow',
      'onInlineEditRow',
    ].forEach((key) => {
      if (this.c[key] !== undefined) this[key] = this.c[key];
    });
    const language = api.init().language || {};
    this.language = language.altEditor || {};
    this._initLanguage();
    table.altEditor = this;
    this.selectionListener();
    this._setup();
    this._inline = new InlineEditor(this);
    if (!language.altEditor && language.altEditorUrl)
      this._languageRequest = $.ajax({
        url: language.altEditorUrl,
        dataType: 'json',
        timeout: 15000,
        success: (json) => {
          if (!this._destroyed) {
            try {
              this._initLanguage(json);
            } catch (error) {
              emit(this, 'error', { action: 'language', error });
              console.warn('AltEditor could not apply the translation', error);
            }
          }
        },
        error: (_response, status, error) => {
          if (this._destroyed || status === 'abort') return;
          const failure = new Error(String(error || status));
          emit(this, 'error', { action: 'language', error: failure });
          console.warn('AltEditor could not load the translation', failure);
        },
      });
    api.on('destroy' + this.s.namespace, () => this.destroy());
  }
  Object.assign(AltEditor.prototype, dialogs, fields, plugins, actions, {
    selectionListener: function () {
      var dt = this.s.dt;
      var toggleEditButton = () => {
        if (typeof dt.buttons !== 'function') return;
        var buttons = dt.buttons('edit:name');
        if (
          !buttons ||
          (typeof buttons.count === 'function' && buttons.count() === 0)
        )
          return;
        if (this._selectedRows().count() === 1) buttons.enable();
        else buttons.disable();
      };

      dt.off('select' + this.s.namespace + ' deselect' + this.s.namespace);
      dt.on('select' + this.s.namespace, toggleEditButton);
      dt.on('deselect' + this.s.namespace, toggleEditButton);
      toggleEditButton();
    },
    /** @returns {DataTable.Api} The associated table API. */
    api: function () {
      return this.s.dt;
    },
    completeColumnDefs: function () {
      return normalizeColumns(this.api());
    },
    _getValueByPath: readPath,
    _setValueByPath: writePath,
    _resolveSnapshotRow: function (snapshot) {
      return resolveRow(this.api(), snapshot);
    },
    _selectedRows: function (selector) {
      const api = this.api();
      if (selector !== undefined) return api.rows(selector);
      return typeof api.rows().select === 'function'
        ? api.rows({ selected: true })
        : api.rows(() => false);
    },
    /** @deprecated Use openAddDialog(). */
    _openAddModal: function () {
      return this.openAddDialog();
    },
    /** @deprecated Use openEditDialog(rowSelector). */
    _openEditModal: function (selector) {
      return this.openEditDialog(selector);
    },
    /** @deprecated Use openDeleteDialog(rowSelector). */
    _openDeleteModal: function (selector) {
      return this.openDeleteDialog(selector);
    },
    _bindDialog: function (action) {
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
      emit(this, 'open', { action, mode: 'dialog' });
    },
    /** Start editing an eligible DataTables cell selector. @returns {boolean} Whether editing started. */
    startInlineEdit: function (cellSelector) {
      return this._inline.start(cellSelector);
    },
    /** Validate and submit the active cell. @returns {boolean} Whether submission started. */
    commitInlineEdit: function () {
      return this._inline.commit();
    },
    /** Cancel an unsaved cell. Pending persistence cannot be canceled. @returns {boolean} Whether editing was canceled. */
    cancelInlineEdit: function () {
      return this._inline.cancel();
    },
    /** @returns {boolean} Whether a cell is editing or awaiting persistence. */
    isInlineEditing: function () {
      return !!this._inline.session;
    },
    internalOpenDialog: function (selector, fill) {
      this._returnFocus = document.activeElement;
      const adapter = bootstrap.available()
        ? bootstrap
        : foundation.available()
          ? foundation
          : null;
      if (!adapter) {
        const error = new Error(this.language.error.dialogFramework);
        this._showErrorMessage(error.message);
        emit(this, 'error', { action: 'open', mode: 'dialog', error });
        return false;
      }
      this._adapter = adapter;
      fill();
      adapter.show($(selector)[0]);
    },
    internalCloseDialog: function (selector) {
      if (this._adapter) this._adapter.hide($(selector)[0]);
    },
    /** Refresh Ajax data, or redraw client-side data. */
    refresh: function () {
      const api = this.api();
      const payload = { action: 'refresh', mode: 'dialog' };
      if (!emit(this, 'pre-submit', payload)) return;
      emit(this, 'submit', payload);
      if (api.ajax.url())
        api.ajax.reload(() => emit(this, 'success', payload), false);
      else {
        api.draw(false);
        emit(this, 'success', payload);
      }
    },
    /** Dispose editor-owned listeners, integrations, and dialog elements. */
    destroy: function () {
      if (this._destroyed) return;
      this._destroyed = true;
      this._inline.destroy();
      this._buttonActions.forEach((entry) => {
        const button = this.api().button(entry.name + ':name');
        if (button.count() && button.action() === entry.action)
          button.action(entry.original || function () {});
      });
      this._buttonActions = [];
      if (this._languageRequest) this._languageRequest.abort();
      this._cleanupPlugins();
      const modal = $(this.modal_selector);
      if (this._adapter && modal.length) {
        this._adapter.dispose(modal[0]);
      }
      modal.off(this.s.namespace).remove();
      if (this._message) this._message.remove();
      this.api().off(this.s.namespace);
      delete this.api().table().node().altEditor;
      emit(this, 'destroy', {});
    },
    _destroy: function () {
      this.destroy();
    },
  });
  AltEditor.version = '4.0.2';
  AltEditor.defaults = defaults;
  AltEditor.classes = { btn: 'btn' };
  return AltEditor;
}

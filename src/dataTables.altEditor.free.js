import $ from 'jquery';
import DataTables from 'datatables.net';
const DataTable = DataTables.Api ? DataTables : DataTables(window, $);
var _instance = 0;

/**
 * altEditor provides modal editing of records for Datatables
 *
 * @class altEditor
 * @constructor
 * @param {object}
 *            oTD DataTables settings object
 * @param {object}
 *            oConfig Configuration object for altEditor
 */
var altEditor = function (dt, opts) {
  if (!DataTable.versionCheck || !DataTable.versionCheck('2.1')) {
    throw new Error('altEditor requires DataTables 2.1 or greater');
  }

  // User and defaults configuration object
  this.c = $.extend(
    true,
    {},
    DataTable.defaults.altEditor,
    altEditor.defaults,
    opts,
  );

  /**
   * @namespace Settings object which contains customisable information
   *            for altEditor instance
   */
  var instanceId = _instance++;
  this.s = {
    /** @type {DataTable.Api} DataTables' API instance */
    dt: new DataTable.Api(dt),

    /** @type {String} Persistent event namespace for this editor instance */
    namespace: '.altEditor' + instanceId,

    /** @type {String} Per-dialog event namespace */
    modalNamespace: '.altEditorModal' + instanceId,
  };

  /**
   * @namespace Common and useful DOM elements for the class instance
   */
  this.dom = {
    /** @type {jQuery} altEditor handle */
    modal: $('<div class="dt-altEditor-handle"/>'),
  };

  this._destroyed = false;
  this._languageRequest = null;
  this._editSnapshot = null;
  this._deleteSnapshot = null;
  this._submitting = false;

  /* Constructor logic */
  this._constructor();
};

$.extend(altEditor.prototype, {
  /***************************************************************
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Constructor * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   */

  /**
   * Initialise the RowReorder instance
   *
   * @private
   */
  _constructor: function () {
    var that = this;
    var dt = this.s.dt;
    var settings = dt.settings()[0];
    var init = settings.oInit || {};

    if (init.onAddRow) that.onAddRow = init.onAddRow;
    if (init.onDeleteRow) that.onDeleteRow = init.onDeleteRow;
    if (init.onEditRow) that.onEditRow = init.onEditRow;

    that.closeModalOnSuccess = init.closeModalOnSuccess;
    if (that.closeModalOnSuccess === undefined) that.closeModalOnSuccess = true;

    that.encodeFiles = init.encodeFiles;
    if (that.encodeFiles === undefined) that.encodeFiles = true;

    that.debug = init.debug === true;

    this.selectionListener();

    var lang = settings.oLanguage || {};
    if (lang.altEditor) {
      this.language = lang.altEditor;
      this._setup();
    } else if (
      typeof lang.altEditorUrl === 'string' &&
      lang.altEditorUrl !== ''
    ) {
      this._languageRequest = $.ajax({
        dataType: 'json',
        url: lang.altEditorUrl,
        success: function (json) {
          if (that._destroyed) return;
          that.language = json;
          that._setup();
        },
        error: function (_xhr, status) {
          if (that._destroyed || status === 'abort') return;
          that.language = {};
          that._setup();
        },
        complete: function () {
          that._languageRequest = null;
        },
      });
    } else {
      this.language = {};
      this._setup();
    }

    dt.on('destroy' + this.s.namespace, function () {
      that._destroy();
    });
  },

  /***************************************************************
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   * Private methods * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   */

  /**
   * Setup dom and bind button actions
   *
   * @private
   */
  _setup: function () {
    var that = this;
    var dt = this.s.dt;
    if (this._destroyed) return;

    this.random_id = String(Math.random()).replace('.', '');
    var modalId = 'altEditor-modal-' + this.random_id;
    var titleId = modalId + '-title';
    var bodyId = modalId + '-body';
    this.modal_selector = '#' + modalId;

    this._initLanguage();

    var modal = document.createElement('div');
    modal.className = 'modal fade altEditor-modal reveal';
    modal.id = modalId;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', titleId);
    modal.setAttribute('aria-describedby', bodyId);
    modal.setAttribute('data-backdrop', 'static');
    modal.setAttribute('data-keyboard', 'false');
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
    closeButton.className = 'close close-button';
    closeButton.setAttribute('data-dismiss', 'modal');
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
    var cleanupDialog = function () {
      that._cleanupPlugins();
      that._removeModalEvents(this);
      that._editSnapshot = null;
      that._deleteSnapshot = null;
      that._setDialogSubmitting(false);
    };
    $modal.on('hidden.bs.modal' + this.s.namespace, cleanupDialog);
    $modal.on('closed.zf.reveal' + this.s.namespace, function () {
      cleanupDialog.call(this);
      $('.reveal-overlay').hide();
    });

    var buttonActions = [
      {
        name: 'edit',
        open: function () {
          that._openEditModal();
        },
        form: 'edit',
        submit: function () {
          that._editRowData();
        },
      },
      {
        name: 'delete',
        open: function () {
          that._openDeleteModal();
        },
        form: 'delete',
        submit: function () {
          that._deleteRow();
        },
      },
      {
        name: 'add',
        open: function () {
          that._openAddModal();
        },
        form: 'add',
        submit: function () {
          that._addRowData();
        },
      },
    ];

    if (typeof dt.button === 'function') {
      buttonActions.forEach(function (definition) {
        var button = dt.button(definition.name + ':name');
        if (
          !button ||
          (typeof button.count === 'function' && button.count() === 0)
        )
          return;
        button.action(function () {
          definition.open();
          $('#altEditor-' + definition.form + '-form-' + that.random_id)
            .off('submit' + that.s.modalNamespace)
            .on('submit' + that.s.modalNamespace, function (event) {
              event.preventDefault();
              event.stopPropagation();
              definition.submit();
            });
        });
      });
    }

    var getColumnNumberByName = function (name) {
      if (!name) return null;
      var index = null;
      dt.columns().every(function (i) {
        var headerNode = dt.column(i).header();
        var $header =
          headerNode && typeof headerNode.to$ === 'function'
            ? headerNode.to$()
            : $(headerNode);
        if ($header.attr('name') === name) {
          index = i;
          return false;
        }
      });
      if (
        index === null &&
        dt.context &&
        dt.context[0] &&
        Array.isArray(dt.context[0].aoColumns)
      ) {
        var fallback = dt.context[0].aoColumns.findIndex(function (column) {
          return (
            (column.data !== undefined ? column.data : column.mData) === name
          );
        });
        if (fallback >= 0) index = fallback;
      }
      return index;
    };

    var checkUnique = function (event) {
      var target = $(event.target);
      if (target.attr('data-unique') !== 'true') return;
      var index = getColumnNumberByName(target.attr('name'));
      if (index === null) {
        event.target.setCustomValidity('');
        return;
      }

      var candidate = target.val();
      var candidates = Array.isArray(candidate) ? candidate : [candidate];
      var formName = target.closest('form').attr('name') || '';
      var editIndex =
        formName.indexOf('altEditor-edit-form-') === 0 && that._editSnapshot
          ? that._editSnapshot.rowIndex
          : null;
      var rowIndexes = dt.rows().indexes().toArray();

      event.target.setCustomValidity('');
      var duplicate = candidates.some(function (value) {
        return rowIndexes.some(function (rowIndex) {
          if (editIndex !== null && rowIndex === editIndex) return false;
          return value == dt.cell(rowIndex, index).data();
        });
      });
      if (duplicate) event.target.setCustomValidity(that.language.error.unique);
    };

    $modal.on('input' + this.s.namespace, '[data-unique]', checkUnique);
    $modal.on('change' + this.s.namespace, 'select[data-unique]', checkUnique);

    if (typeof dt.button === 'function') {
      var refreshButton = dt.button('refresh:name');
      if (
        refreshButton &&
        (!refreshButton.count || refreshButton.count() > 0)
      ) {
        refreshButton.action(function (_event, tableApi) {
          if (
            tableApi.ajax &&
            typeof tableApi.ajax.url === 'function' &&
            tableApi.ajax.url()
          ) {
            tableApi.ajax.reload();
          }
        });
      }
    }
  },

  /**
   * Init translate
   *
   * @private
   */
  _initLanguage: function () {
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

    this.language = $.extend(true, {}, defaults, this.language || {});
  },

  /**
   * Emit an event on the DataTable for listeners
   *
   * @param {string}
   *            name Event name
   * @param {array}
   *            args Event arguments
   * @private
   */
  _emitEvent: function (name, args) {
    this.s.dt.iterator('table', function (ctx, i) {
      $(ctx.nTable).triggerHandler(name + '.dt', args);
    });
  },

  /**
   * Open Edit Modal for selected row
   *
   * @private
   */
  _openEditModal: function () {
    var dt = this.s.dt;
    var selectedRows = dt.rows({ selected: true });
    if (!selectedRows || selectedRows.count() !== 1) {
      this._showErrorMessage('Exactly one row must be selected for editing.');
      return;
    }

    var rowIndex = selectedRows.indexes().toArray()[0];
    var rowData = selectedRows.data()[0];
    if (rowIndex === undefined || rowData === undefined) return;

    this._editSnapshot = {
      rowIndex: rowIndex,
      rowNode: dt.row(rowIndex).node(),
      originalData: rowData,
    };

    var columnDefs = this.completeColumnDefs();
    this.createDialog(
      columnDefs,
      this.language.edit.title,
      this.language.edit.button,
      this.language.modalClose,
      'editRowBtn',
      'altEditor-edit-form',
    );

    var that = this;
    columnDefs.forEach(function (columnDef) {
      if (!columnDef.name || columnDef.editable === false) return;
      var selector = '#' + String(columnDef.name).replace(/\./g, '\\.');
      var $element = $(that.modal_selector)
        .find(selector)
        .filter(':input[type!="file"]');
      if (!$element.length) return;
      var value = that._getValueByPath(rowData, columnDef.name);
      that._setFieldValue($element, columnDef, value);
      $element.trigger('change');
    });

    this._focusFirstInput();
    $(this.modal_selector)
      .trigger('alteditor:some_dialog_opened')
      .trigger('alteditor:edit_dialog_opened');
  },

  /**
   * Callback for "Edit" button
   */
  _editRowData: function () {
    var that = this;
    var snapshot = this._editSnapshot;
    if (!snapshot || this._submitting) return;

    var $form = $('form[name="altEditor-edit-form-' + this.random_id + '"]');
    if (!$form.length) {
      this._errorCallback(new Error('Edit form not found'));
      return;
    }

    var errors = this._validateFormData($form);
    if (errors.length) {
      this._errorCallback(new Error(errors.join('\n')));
      return;
    }

    this._setDialogSubmitting(true);
    this._collectFormData($form)
      .then(function (rowData) {
        try {
          that.onEditRow(
            that,
            rowData,
            function (data) {
              that._editRowCallback(data);
            },
            function (error) {
              that._errorCallback(error);
            },
            snapshot.originalData,
          );
        } catch (error) {
          that._errorCallback(error);
        }
      })
      .catch(function (error) {
        that._errorCallback(error);
      });
  },

  /**
   * Open Delete Modal for selected row
   *
   * @private
   */
  _openDeleteModal: function () {
    var selectedRows = this.s.dt.rows({ selected: true });
    if (!selectedRows || selectedRows.count() === 0) {
      this._showErrorMessage('At least one row must be selected for deletion.');
      return;
    }

    this._deleteSnapshot = {
      rowIndexes: selectedRows.indexes().toArray(),
      rows: selectedRows.data().toArray(),
      rowNodes: selectedRows.nodes().toArray(),
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
            that.language.deleteMessage,
          ),
        );
      $modal
        .find('.modal-footer')
        .empty()
        .append(
          $('<button/>', {
            type: 'button',
            class: 'btn btn-default button secondary',
            'data-dismiss': 'modal',
            'data-close': '',
            text: that.language.modalClose,
          }),
        )
        .append(
          $('<button/>', {
            type: 'submit',
            class: 'btn btn-danger button',
            id: 'deleteRowBtn',
            text: that.language.delete.button,
          }),
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
          }),
        );
      }
    };

    this.internalOpenDialog(selector, fill);
    this._focusFirstInput();
    $(selector)
      .trigger('alteditor:some_dialog_opened')
      .trigger('alteditor:delete_dialog_opened');
  },

  /**
   * Callback for "Delete" button
   */
  _deleteRow: function () {
    if (this._submitting) return;
    var that = this;
    var snapshot = this._deleteSnapshot;
    if (!snapshot || !snapshot.rows || snapshot.rows.length === 0) {
      this._errorCallback(new Error('No deletion target is available'));
      return;
    }

    this._setDialogSubmitting(true);
    try {
      this.onDeleteRow(
        this,
        snapshot.rows.slice(),
        function (data) {
          that._deleteRowCallback(data);
        },
        function (error) {
          that._errorCallback(error);
        },
      );
    } catch (error) {
      this._errorCallback(error);
    }
  },

  /**
   * Open Add Modal for selected row
   *
   * @private
   */
  _openAddModal: function () {
    var columnDefs = this.completeColumnDefs();
    this.createDialog(
      columnDefs,
      this.language.add.title,
      this.language.add.button,
      this.language.modalClose,
      'addRowBtn',
      'altEditor-add-form',
    );

    var that = this;
    columnDefs.forEach(function (columnDef) {
      if (
        !columnDef.name ||
        columnDef.value === null ||
        columnDef.value === undefined
      )
        return;
      var selector = '#' + String(columnDef.name).replace(/\./g, '\\.');
      var $element = $(that.modal_selector)
        .find(selector)
        .filter(':input[type!="file"]');
      if (!$element.length) return;
      that._setFieldValue($element, columnDef, columnDef.value);
      $element.trigger('change');
    });

    this._focusFirstInput();
    $(this.modal_selector)
      .trigger('alteditor:some_dialog_opened')
      .trigger('alteditor:add_dialog_opened');
  },

  selectionListener: function () {
    var dt = this.s.dt;
    var toggleEditButton = function () {
      if (typeof dt.buttons !== 'function') return;
      var buttons = dt.buttons('edit:name');
      if (
        !buttons ||
        (typeof buttons.count === 'function' && buttons.count() === 0)
      )
        return;
      if (dt.rows({ selected: true }).count() === 1) buttons.enable();
      else buttons.disable();
    };

    dt.off('select' + this.s.namespace + ' deselect' + this.s.namespace);
    dt.on('select' + this.s.namespace, toggleEditButton);
    dt.on('deselect' + this.s.namespace, toggleEditButton);
    toggleEditButton();
  },

  /**
   * Complete DataTable.context[0].aoColumns with default values
   */
  completeColumnDefs: function () {
    var dt = this.s.dt;
    return dt.context[0].aoColumns.map(function (obj) {
      return {
        title: obj.sTitle,
        placeholder:
          obj.placeholder !== undefined
            ? obj.placeholder
            : obj.title !== undefined
              ? obj.title
              : obj.sTitle,
        editable: obj.editable !== undefined ? obj.editable : true,
        visible: obj.visible !== undefined ? obj.visible : true,
        name: obj.data !== undefined ? obj.data : obj.mData,
        type: obj.type !== undefined ? obj.type : 'text',
        rows: obj.rows !== undefined ? obj.rows : '5',
        cols: obj.cols !== undefined ? obj.cols : '30',
        options: obj.options !== undefined ? obj.options : [],
        readonly: obj.readonly !== undefined ? obj.readonly : false,
        disabled: obj.disabled !== undefined ? obj.disabled : false,
        required: obj.required !== undefined ? obj.required : false,
        hoverMsg: obj.hoverMsg !== undefined ? obj.hoverMsg : '',
        pattern: obj.pattern !== undefined ? obj.pattern : '.*',
        accept: obj.accept !== undefined ? obj.accept : '',
        special: obj.special !== undefined ? obj.special : '',
        unique: obj.unique !== undefined ? obj.unique : false,
        maxLength: obj.maxLength !== undefined ? obj.maxLength : false,
        multiple: obj.multiple !== undefined ? obj.multiple : false,
        select2: obj.select2 !== undefined ? obj.select2 : false,
        datepicker: obj.datepicker !== undefined ? obj.datepicker : false,
        datetimepicker:
          obj.datetimepicker !== undefined ? obj.datetimepicker : false,
        editorOnChange:
          obj.editorOnChange !== undefined ? obj.editorOnChange : null,
        style: obj.style !== undefined ? obj.style : '',
        dateFormat: obj.dateFormat !== undefined ? obj.dateFormat : '',
        optionsSortByLabel:
          obj.optionsSortByLabel !== undefined ? obj.optionsSortByLabel : false,
        inline: obj.inline !== undefined ? obj.inline : false,
        step: obj.step !== undefined ? obj.step : null,
        min: obj.min !== undefined ? obj.min : null,
        max: obj.max !== undefined ? obj.max : null,
        value: obj.value !== undefined ? obj.value : '',
      };
    });
  },

  /**
   * Create both Edit and Add dialogs
   * @param columnDefs as returned by completeColumnDefs()
   */
  createDialog: function (
    columnDefs,
    modalTitle,
    buttonCaption,
    closeCaption,
    buttonClass,
    formName,
  ) {
    formName = formName + '-' + this.random_id;
    var fragment = document.createDocumentFragment();
    var container = document.createElement('div');
    container.className = 'container';
    var row = document.createElement('div');
    row.className = 'row';
    var col = document.createElement('div');
    col.className = 'col-12 col-sm-12 col-md-12 col-lg-10 mx-auto';
    row.appendChild(col);
    container.appendChild(row);
    fragment.appendChild(container);

    var that = this;
    var inlineCount = 0;

    columnDefs.forEach(function (columnDef) {
      var title = String(columnDef.title || '')
        .replace(/(<([^>]+)>)/gi, '')
        .trim();
      if (!columnDef.name) return;

      if (String(columnDef.type).indexOf('hidden') >= 0) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = String(columnDef.name);
        that._setElementAttributes(hidden, columnDef, ['name']);
        if (columnDef.value !== undefined && columnDef.value !== null)
          hidden.value = columnDef.value;
        col.appendChild(hidden);
        return;
      }

      if (!title || columnDef.editable === false) return;

      var formGroup = document.createElement('div');
      formGroup.className =
        'form-group row' + (columnDef.visible === false ? ' nonDisplay' : '');
      formGroup.id = 'alteditor-row-' + String(columnDef.name);

      if (!columnDef.inline || inlineCount === 0) {
        var labelCol = document.createElement('div');
        labelCol.className =
          'col-12 col-sm-12 col-md-4 text-left text-sm-left text-md-right';
        var label = document.createElement('label');
        label.className = 'col-form-label col-form-label-sm';
        label.htmlFor = String(columnDef.name);
        label.textContent = title + ':';
        labelCol.appendChild(label);
        formGroup.appendChild(labelCol);
      }

      var inputCol = document.createElement('div');
      inputCol.className = columnDef.inline
        ? 'col-sm-2 col-md-2 col-lg-2'
        : 'col-12 col-sm-12 col-md-8';
      formGroup.appendChild(inputCol);

      var type = String(columnDef.type || 'text');
      if (type.indexOf('select') >= 0) {
        var select = document.createElement('select');
        select.className =
          'w-100 form-control form-control-sm' +
          (columnDef.select2 ? ' select2' : '');
        select.id = String(columnDef.name);
        that._setElementAttributes(select, columnDef, [
          'name',
          'style',
          'disabled',
          'required',
          'multiple',
        ]);
        select.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
        if (columnDef.placeholder)
          select.setAttribute(
            'data-placeholder',
            String(columnDef.placeholder),
          );

        var normalized = that._normalizeOptions(columnDef.options);
        normalized.forEach(function (option) {
          var optionElement = document.createElement('option');
          optionElement.value = String(option.value);
          optionElement.textContent = String(option.label);
          if (String(option.value) === String(columnDef.value))
            optionElement.selected = true;
          select.appendChild(optionElement);
        });
        inputCol.appendChild(select);
      } else if (type.indexOf('textarea') >= 0) {
        var textarea = document.createElement('textarea');
        textarea.className = 'w-100 form-control form-control-sm';
        textarea.id = String(columnDef.name);
        that._setElementAttributes(textarea, columnDef, [
          'name',
          'style',
          'rows',
          'cols',
          'maxLength',
          'readonly',
          'disabled',
          'required',
        ]);
        textarea.placeholder = String(columnDef.placeholder || title);
        textarea.setAttribute(
          'data-unique',
          columnDef.unique ? 'true' : 'false',
        );
        if (columnDef.value !== undefined && columnDef.value !== null)
          textarea.value = columnDef.value;
        inputCol.appendChild(textarea);
      } else {
        var input = document.createElement('input');
        input.className =
          'w-100 form-control form-control-sm' +
          (columnDef.readonly ? ' readonlyText' : '');
        input.id = String(columnDef.name);
        input.title = String(columnDef.hoverMsg || '');
        input.placeholder = String(columnDef.placeholder || title);
        input.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
        that._setElementAttributes(input, columnDef, [
          'type',
          'pattern',
          'accept',
          'name',
          'step',
          'min',
          'max',
          'maxLength',
          'readonly',
          'disabled',
          'required',
          'style',
        ]);
        if (columnDef.value !== undefined && columnDef.value !== null)
          input.value = columnDef.value;
        inputCol.appendChild(input);
      }

      var errorLabel = document.createElement('label');
      errorLabel.id = String(columnDef.name) + '-label';
      errorLabel.className = 'errorLabel';
      inputCol.appendChild(errorLabel);
      col.appendChild(formGroup);
      inlineCount++;
    });

    this.columnDefs = columnDefs;
    this._currentDialogFragment = fragment.cloneNode(true);
    var selector = this.modal_selector;
    var fill = function () {
      var $modal = $(selector);
      $modal.find('.modal-title').text(modalTitle);
      $modal
        .find('.modal-body')
        .empty()
        .append(that._currentDialogFragment.cloneNode(true));
      $modal
        .find('.modal-footer')
        .empty()
        .append(
          $('<button/>', {
            type: 'button',
            class: 'btn btn-default button secondary',
            'data-dismiss': 'modal',
            'data-close': '',
            text: closeCaption,
          }),
        )
        .append(
          $('<button/>', {
            type: 'submit',
            class: 'btn btn-primary button',
            id: buttonClass,
            form: formName,
            text: buttonCaption,
          }),
        );

      var modalContent = $modal.find('.modal-content');
      if (modalContent.parent().is('form')) {
        modalContent
          .parent()
          .attr('name', formName)
          .attr('id', formName)
          .addClass('needs-validation');
      } else {
        modalContent.wrap(
          $('<form/>', {
            name: formName,
            id: formName,
            role: 'form',
            class: 'needs-validation',
          }),
        );
      }
    };

    this.internalOpenDialog(selector, fill);
    this._applyDialogFragment();
    this._focusFirstInput();

    var temp = document.createElement('div');
    temp.appendChild(fragment.cloneNode(true));
    return temp.innerHTML;
  },

  /**
   * Callback for "Add" button
   */
  _addRowData: function () {
    if (this._submitting) return;
    var that = this;
    var $form = $('form[name="altEditor-add-form-' + this.random_id + '"]');
    if (!$form.length) {
      this._errorCallback(new Error('Add form not found'));
      return;
    }

    var errors = this._validateFormData($form);
    if (errors.length) {
      this._errorCallback(new Error(errors.join('\n')));
      return;
    }

    this._setDialogSubmitting(true);
    this._collectFormData($form)
      .then(function (rowData) {
        try {
          that.onAddRow(
            that,
            rowData,
            function (data) {
              that._addRowCallback(data);
            },
            function (error) {
              that._errorCallback(error);
            },
          );
        } catch (error) {
          that._errorCallback(error);
        }
      })
      .catch(function (error) {
        that._errorCallback(error);
      });
  },

  /**
   * Called after a row has been deleted on server
   */
  _deleteRowCallback: function (response, status, more) {
    var snapshot = this._deleteSnapshot;
    if (!snapshot || !snapshot.rowIndexes || snapshot.rowIndexes.length === 0) {
      this._errorCallback(new Error('Deletion target is no longer available'));
      return;
    }

    try {
      this.s.dt.rows(snapshot.rowIndexes).remove();
      this.s.dt.draw('full-hold');
      this._deleteSnapshot = null;
      this._completeSuccessfulSubmit();
      if (this.debug) console.log('_deleteRowCallback completed.', response);
    } catch (error) {
      this._errorCallback(error);
    }
  },

  /**
   * Called after a row has been inserted on server
   */
  _addRowCallback: function (response, status, more) {
    var data = this._normalizeResponseData(response);
    try {
      this.s.dt.row.add(data).draw(false);
      this._completeSuccessfulSubmit();
      if (this.debug) console.log('_addRowCallback completed.', data);
    } catch (error) {
      this._errorCallback(error);
    }
  },

  /**
   * Called after a row has been updated on server
   */
  _editRowCallback: function (response, status, more) {
    var data = this._normalizeResponseData(response);
    var snapshot = this._editSnapshot;
    if (!snapshot) {
      this._errorCallback(new Error('Edit target is no longer available'));
      return;
    }

    try {
      var row = this._resolveSnapshotRow(snapshot);
      if (!row) throw new Error('Edit target row no longer exists');
      row.data(data);
      var currentPage = this.s.dt.page();
      this.s.dt.draw('page');
      this.s.dt.page(currentPage).draw('page');
      this._editSnapshot = null;
      this._completeSuccessfulSubmit();
      if (this.debug) console.log('_editRowCallback completed.', data);
    } catch (error) {
      this._errorCallback(error);
    }
  },

  /**
   * Called after AJAX server returned an error
   */
  _errorCallback: function (response, status, more) {
    var error = response || {};
    var message = this.language.error.message;

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

  /**
   * Default callback for insertion: mock webservice, always success.
   */
  onAddRow: function (dt, rowdata, success, error) {
    try {
      success(rowdata);
    } catch (exception) {
      if (error) error(exception);
    }
  },

  /**
   * Default callback for editing: mock webservice, always success.
   */
  onEditRow: function (dt, rowdata, success, error, originalRowData) {
    try {
      var merged = $.extend(true, {}, originalRowData || {}, rowdata || {});
      success(merged);
    } catch (exception) {
      if (error) error(exception);
    }
  },

  /**
   * Default callback for deletion: mock webservice, always success.
   */
  onDeleteRow: function (dt, rowdata, success, error) {
    try {
      success(rowdata);
    } catch (exception) {
      if (error) error(exception);
    }
  },

  /**
   * Open a dialog using available framework
   */
  internalOpenDialog: function (selector, onopen) {
    try {
      var $sel = $(selector);
      if (typeof $sel.modal === 'function') {
        $sel
          .off('show.bs.modal.altEditorFill')
          .on('show.bs.modal.altEditorFill', onopen);
        $sel.modal('show');
      } else if (
        typeof $sel.foundation === 'function' &&
        window.Foundation &&
        window.Foundation.Reveal
      ) {
        $sel
          .off('open.zf.reveal.altEditorFill')
          .on('open.zf.reveal.altEditorFill', onopen);
        var element = $sel[0];
        var popup = element && element._altEditorReveal;
        if (!popup) {
          popup = new window.Foundation.Reveal($sel);
          if (element) element._altEditorReveal = popup;
        }
        popup.open();
      } else {
        throw new Error(
          'Bootstrap Modal or Foundation Reveal is required to open altEditor dialogs',
        );
      }
    } catch (error) {
      console.error('Error opening dialog:', error);
      this._errorCallback(error);
    }
  },

  /**
   * Close a dialog using available framework
   */
  internalCloseDialog: function (selector) {
    try {
      var $sel = $(selector);
      if (typeof $sel.modal === 'function') {
        $sel.modal('hide');
      } else if (
        typeof $sel.foundation === 'function' &&
        window.Foundation &&
        window.Foundation.Reveal
      ) {
        var element = $sel[0];
        var popup = element && element._altEditorReveal;
        if (popup && typeof popup.close === 'function') popup.close();
        else $sel.foundation('close');
      }
    } catch (error) {
      console.error('Error closing dialog:', error);
      this._cleanupPlugins();
      this._removeModalEvents(selector);
    }
  },

  /**
   * Dinamically reload options in SELECT menu
   */
  reloadOptions: function ($select, options) {
    if (!$select || !$select.length) return;
    var oldValue = $select.val();
    var normalized = this._normalizeOptions(options || []);
    $select.empty();
    normalized.forEach(function (option) {
      $('<option/>').val(option.value).text(option.label).appendTo($select);
    });
    if (oldValue !== undefined && oldValue !== null) $select.val(oldValue);
    $select.trigger('change');
  },

  /**
   * Convert file to Base 64 form
   * @see https://stackoverflow.com/questions/36280818
   */
  getBase64: function (file, onSuccess, onError) {
    var reader = new FileReader();
    reader.onload = function () {
      if (onSuccess) onSuccess(reader.result);
    };
    reader.onerror = function () {
      var error = reader.error || new Error('Failed to read file');
      if (onError) onError(error);
    };
    reader.onabort = function () {
      if (onError) onError(new Error('File read was aborted'));
    };
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      if (onError) onError(error);
    }
  },

  _destroy: function () {
    if (this._destroyed) return;
    this._destroyed = true;

    if (
      this._languageRequest &&
      typeof this._languageRequest.abort === 'function'
    ) {
      try {
        this._languageRequest.abort();
      } catch (_error) {}
      this._languageRequest = null;
    }

    this._cleanupPlugins();

    if (this.modal_selector) {
      var $modal = $(this.modal_selector);
      var element = $modal[0];
      var reveal = element && element._altEditorReveal;
      if (reveal && typeof reveal.destroy === 'function') {
        try {
          reveal.destroy();
        } catch (_error) {}
      }
      $modal.off(this.s.namespace).off(this.s.modalNamespace).remove();
    }

    if (this.s && this.s.dt) {
      this.s.dt.off(this.s.namespace);
      var body =
        this.s.dt.table && this.s.dt.table().body
          ? this.s.dt.table().body()
          : null;
      if (body) $(body).off(this.s.namespace);
    }
    $(document.body).off(this.s.namespace);
    this._editSnapshot = null;
    this._deleteSnapshot = null;
  },

  _applyDialogFragment: function () {
    if (!this._currentDialogFragment) return;
    var $modal = $(this.modal_selector);
    var body = $modal.find('.modal-body')[0];
    if (!body) return;
    this._removeModalEvents($modal);
    body.innerHTML = '';
    body.appendChild(this._currentDialogFragment.cloneNode(true));
    this._currentDialogFragment = null;
    this._initializePlugins();
  },

  _initializePlugins: function () {
    if (!this.columnDefs || !Array.isArray(this.columnDefs)) return;
    var that = this;
    var selector = this.modal_selector;
    var escapeSelector = function (value) {
      var text = String(value || '');
      if ($.escapeSelector) return $.escapeSelector(text);
      return text.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, '\\$1');
    };

    this.columnDefs.forEach(function (columnDef) {
      var $element = $(selector).find('#' + escapeSelector(columnDef.name));
      if (!$element.length) return;

      if (
        String(columnDef.type || '').indexOf('select') >= 0 &&
        columnDef.optionsSortByLabel
      ) {
        var oldValue = $element.val();
        var options = $element.find('option').get();
        options.sort(function (a, b) {
          return $(a).text().localeCompare($(b).text());
        });
        $element.empty().append(options);
        if (oldValue !== undefined && oldValue !== null) $element.val(oldValue);
      }

      if (columnDef.select2) {
        if (typeof $.fn.select2 === 'function') {
          var config =
            typeof columnDef.select2 === 'object'
              ? $.extend({}, columnDef.select2)
              : {};
          config.dropdownParent = $(that.modal_selector);
          $element.select2(config);
        }
      } else if (
        columnDef.datepicker &&
        typeof $.fn.datepicker === 'function'
      ) {
        $element.datepicker(columnDef.datepicker);
      } else if (
        columnDef.datetimepicker &&
        typeof $.fn.datetimepicker === 'function'
      ) {
        $element.datetimepicker(columnDef.datetimepicker);
      }

      if (typeof columnDef.editorOnChange === 'function') {
        $element.attr('alt-editor-id', String(columnDef.name));
        $element
          .off('change' + that.s.modalNamespace)
          .on('change' + that.s.modalNamespace, function (event) {
            columnDef.editorOnChange(event, that);
          });
      }
    });
  },

  _cleanupPlugins: function () {
    if (!this.modal_selector) return;
    var selector = this.modal_selector;
    if (typeof $.fn.select2 === 'function') {
      $(selector)
        .find('select.select2-hidden-accessible')
        .each(function () {
          try {
            $(this).select2('destroy');
          } catch (_error) {}
        });
    }
    if (typeof $.fn.datepicker === 'function') {
      $(selector)
        .find('.hasDatepicker')
        .each(function () {
          try {
            $(this).datepicker('destroy');
          } catch (_error) {}
        });
    }
    $(selector).find('[alt-editor-id]').off(this.s.modalNamespace);
  },

  _removeModalEvents: function (modal) {
    var $modal = modal && modal.jquery ? modal : $(modal);
    if ($modal.length) $modal.off(this.s.modalNamespace);
  },

  _focusFirstInput: function () {
    if (!this.modal_selector) return;
    var $target = $(this.modal_selector)
      .find('input, select, textarea, button')
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

  _normalizeOptions: function (options) {
    if (Array.isArray(options)) {
      return options.map(function (option) {
        if (option && typeof option === 'object') {
          var value =
            option.id !== undefined
              ? option.id
              : option.value !== undefined
                ? option.value
                : '';
          var label =
            option.text !== undefined
              ? option.text
              : option.label !== undefined
                ? option.label
                : value;
          return { value: value, label: label };
        }
        return { value: option, label: option };
      });
    }
    if (options && typeof options === 'object') {
      return Object.keys(options).map(function (key) {
        return { value: key, label: options[key] };
      });
    }
    return [];
  },

  _setFieldValue: function ($element, columnDef, value) {
    if (!$element || !$element.length) return;
    var type = String(columnDef.type || 'text');
    var normalized = value === null || value === undefined ? '' : value;

    if (type.indexOf('select') >= 0) {
      var selectValue = normalized;
      if (typeof normalized === 'string') {
        var trimmed = normalized.trim();
        if (trimmed.charAt(0) === '[' || trimmed.charAt(0) === '{') {
          try {
            selectValue = JSON.parse(trimmed);
          } catch (_error) {}
        }
      }
      if (columnDef.select2 && $element.hasClass('select2-hidden-accessible')) {
        $element.val(selectValue).trigger('change');
      } else {
        $element.val(selectValue);
      }
      return;
    }

    if (type.indexOf('checkbox') >= 0) {
      var checked =
        normalized === true ||
        normalized === 1 ||
        ['true', '1', 'yes', 'on'].indexOf(String(normalized).toLowerCase()) >=
          0;
      $element.prop('checked', checked);
      return;
    }

    if (
      type.indexOf('date') >= 0 &&
      columnDef.dateFormat &&
      typeof window.moment === 'function'
    ) {
      var date = window.moment(String(normalized));
      if (date && date.isValid()) {
        $element.val(date.format(columnDef.dateFormat));
        return;
      }
    }

    $element.val(normalized);
  },

  _getValueByPath: function (source, path) {
    if (!source || !path) return undefined;
    return String(path)
      .split('.')
      .reduce(function (value, key) {
        return value === null || value === undefined ? undefined : value[key];
      }, source);
  },

  _setValueByPath: function (target, path, value) {
    var segments = String(path || '').split('.');
    var blocked = { __proto__: true, prototype: true, constructor: true };
    if (
      !segments.length ||
      segments.some(function (segment) {
        return !segment || blocked[segment];
      })
    ) {
      throw new Error('Unsafe or invalid field path: ' + path);
    }
    var cursor = target;
    for (var i = 0; i < segments.length - 1; i++) {
      var segment = segments[i];
      var next = cursor[segment];
      if (!next || Object.prototype.toString.call(next) !== '[object Object]') {
        next = {};
        cursor[segment] = next;
      }
      cursor = next;
    }
    cursor[segments[segments.length - 1]] = value;
  },

  _collectFormData: function ($form) {
    var that = this;
    var values = {};
    var fileTasks = [];

    $form.find('select, textarea, input').each(function () {
      if (this.disabled) return;
      var $input = $(this);
      var id = $input.attr('id');
      if (!id) return;
      var type = String($input.attr('type') || '').toLowerCase();

      if (type === 'file') {
        var files = $input.prop('files');
        var file = files && files[0];
        if (!file) return;
        if (that.encodeFiles) {
          fileTasks.push(
            new Promise(function (resolve, reject) {
              that.getBase64(
                file,
                function (content) {
                  try {
                    that._setValueByPath(values, id, content);
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                },
                reject,
              );
            }),
          );
        } else {
          that._setValueByPath(values, id, file);
        }
        return;
      }

      if (type === 'checkbox') {
        that._setValueByPath(values, id, this.checked);
        return;
      }
      if (type === 'radio') {
        if (this.checked) that._setValueByPath(values, id, $input.val());
        return;
      }
      that._setValueByPath(values, id, $input.val());
    });

    return Promise.all(fileTasks).then(function () {
      return values;
    });
  },

  _validateFormData: function ($form) {
    var errors = [];
    $form.find('select, textarea, input').each(function () {
      if (this.disabled) return;
      var $input = $(this);
      var id = this.id || this.name || 'field';
      if ($input.attr('data-unique') === 'true') {
        $input.trigger($input.is('select') ? 'change' : 'input');
      }
      if (typeof this.checkValidity === 'function' && !this.checkValidity()) {
        errors.push(this.validationMessage || id + ' is invalid');
      }
    });
    return Array.from(new Set(errors));
  },

  _setElementAttributes: function (element, columnDef, attributes) {
    attributes.forEach(function (attribute) {
      var value = columnDef[attribute];
      if (value === undefined || value === null || value === false) return;
      if (typeof value === 'boolean') {
        element.setAttribute(attribute, '');
        return;
      }
      if (attribute === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (property) {
          element.style[property] = value[property];
        });
        return;
      }
      element.setAttribute(attribute, String(value));
    });
  },

  _resolveSnapshotRow: function (snapshot) {
    if (!snapshot) return null;
    var dt = this.s.dt;
    var table = dt.table().node();
    if (
      snapshot.rowNode &&
      snapshot.rowNode.isConnected &&
      snapshot.rowNode.closest('table') === table
    ) {
      var byNode = dt.row(snapshot.rowNode);
      if (byNode && byNode.data() !== undefined) return byNode;
    }
    var byIndex = dt.row(snapshot.rowIndex);
    if (byIndex && byIndex.data() !== undefined) return byIndex;
    return null;
  },

  /**
   * Sanitizes input for use in HTML
   * @param s
   * @param preserveCR
   * @returns {string}
   * @private
   */
  _quoteattr: function (s, preserveCR) {
    if (s == null) {
      return '';
    }

    preserveCR = preserveCR ? '&#13;' : '\n';

    if (Array.isArray(s)) {
      // for MULTIPLE SELECT
      var newArray = [];
      var x;
      for (x in s) newArray.push(s[x]);
      return newArray;
    }

    return ('' + s) /* Forces the conversion to string. */
      .replace(/&/g, '&amp;') /* This MUST be the 1st replacement. */
      .replace(/'/g, '&apos;') /* The 4 other predefined entities, required. */
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r\n/g, preserveCR) /* Must be before the next replacement. */
      .replace(/[\r\n]/g, preserveCR);
  },
});

/**
 * altEditor version
 *
 * @static
 * @type String
 */
altEditor.version = '3.2';

/**
 * altEditor defaults
 *
 * @namespace
 */
altEditor.defaults = {
  /**
   * @type {Boolean} Ask user what they want to do, even for a single
   *       option
   */
  alwaysAsk: false,

  /** @type {string|null} What will trigger a focus */
  focus: null, // focus, click, hover

  /** @type {column-selector} Columns to provide auto fill for */
  columns: '', // all

  /** @type {boolean|null} Update the cells after a drag */
  update: null, // false is editor given, true otherwise

  /** @type {DataTable.Editor} Editor instance for automatic submission */
  editor: null,
};

/**
 * Classes used by altEditor that are configurable
 *
 * @namespace
 */
altEditor.classes = {
  /** @type {String} Class used by the selection button */
  btn: 'btn',
};

// Attach a listener to the document which listens for DataTables
// initialisation
// events so we can automatically initialise
$(document).on('preInit.dt.altEditor', function (e, settings, json) {
  if (e.namespace !== 'dt') {
    return;
  }

  var init = settings.oInit.altEditor;
  var defaults = DataTable.defaults.altEditor;

  if (init || defaults) {
    var opts = $.extend({}, defaults, init);

    if (init !== false) {
      var editor = new altEditor(settings, opts);
      // e is a jQuery event object
      // e.target is the underlying jQuery object, e.g. $('#mytable')
      // so that you can retrieve the altEditor object later
      e.target.altEditor = editor;
    }
  }
});

// Alias for access
DataTable.altEditor = altEditor;
export default altEditor;

/*! DataTables AltEditor v4.1.1
 * Copyright (c) 2016 Kingkode, KasperOlesen, luca-vercelli, zack-hable
 * Copyright (c) 2026 Ben Situ and contributors
 * MIT License */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('jquery'), require('datatables.net')) :
  typeof define === 'function' && define.amd ? define(['jquery', 'datatables.net'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.AltEditor = factory(global.jQuery, global.DataTable));
})(this, (function ($$1, DataTables) { 'use strict';

  let $;
  let root;
  let document;

  function configure(window, jquery) {
    root = window;
    document = window.document;
    $ = jquery;
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]')
      return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function mergeOptions() {
    const result = {};
    Array.prototype.slice.call(arguments).forEach((source) => {
      if (!isPlainObject(source)) return;
      Object.keys(source).forEach((key) => {
        if (['__proto__', 'prototype', 'constructor'].indexOf(key) !== -1)
          throw new Error('Unsafe option key: ' + key);
        const value = source[key];
        result[key] = Array.isArray(value)
          ? value.slice()
          : isPlainObject(value)
            ? mergeOptions(result[key], value)
            : value;
      });
    });
    return result;
  }

  /** @typedef {Object} EditorOptions
   * @property {boolean} [closeModalOnSuccess=true] Close dialogs after successful persistence.
   * @property {boolean} [encodeFiles=true] Read uploaded files as data URLs.
   * @property {boolean} [debug=false] Enable diagnostic messages.
   * @property {Object|boolean} [inlineEdit] Cell editing configuration.
   */
  const defaults$1 = {
    closeModalOnSuccess: true,
    encodeFiles: true,
    debug: false,
    dialog: {
      framework: 'auto',
      templates: { add: null, edit: null },
      deleteDetails: false,
    },
    inlineEdit: {
      enabled: false,
      submitOnBlur: false,
      selectText: true,
      tabNavigation: true,
    },
  };

  function normalizeOptions(base, init, supplied) {
    const root = {};
    [
      'closeModalOnSuccess',
      'encodeFiles',
      'debug',
      'onAddRow',
      'onEditRow',
      'onDeleteRow',
      'onInlineEditRow',
    ].forEach((key) => {
      if (init[key] !== undefined) root[key] = init[key];
    });
    const options = mergeOptions(defaults$1, base, root, init.altEditor, supplied);
    options.inlineEdit = mergeOptions(
      defaults$1.inlineEdit,
      options.inlineEdit === true ? { enabled: true } : options.inlineEdit
    );
    if (
      !isPlainObject(options.dialog) ||
      !['auto', 'bootstrap', 'foundation', 'native'].includes(
        options.dialog.framework
      )
    )
      throw new TypeError(
        'Dialog framework must be auto, bootstrap, foundation, or native'
      );
    if (!isPlainObject(options.dialog.templates))
      throw new TypeError('Dialog templates must be an object');
    return options;
  }

  const keys =
    'editable visible type readonly disabled required hoverMsg pattern unique uniqueMsg maxLength multiple select2 datepicker datetimepicker editorOnChange style dateFormat dateInputFormat optionsSortByLabel inline step min max value options rows cols accept maxFileSize special placeholder inlineEditable inlineEditType inlineEditOptions inlineEditSetValue'.split(
      ' '
    );

  function normalizeColumns(api) {
    const columns = [];
    api.columns().every(function (index) {
      const init = this.init() || {};
      const column = {
        index,
        title: this.header() ? this.header().textContent : '',
        name: this.dataSrc(),
        editable: true,
        visible: this.visible(),
        type: 'text',
        rows: 5,
        cols: 30,
        options: [],
      };
      keys.forEach((key) => {
        if (init[key] !== undefined) column[key] = init[key];
      });
      if (column.type === 'readonly') {
        column.type = 'text';
        column.readonly = true;
      }
      if (column.placeholder === undefined) column.placeholder = column.title;
      columns.push(column);
    });
    return columns;
  }

  /** @typedef {Object} EditorEventPayload
   * @property {Object} editor AltEditor instance.
   * @property {string} [action] CRUD action.
   * @property {string} [mode] Editing interface.
   * @property {*} [values] Candidate values.
   * @property {*} [error] Persistence or validation error.
   */

  /** Emit a cancelable DataTables event and return whether it was accepted. */
  function emit(editor, name, payload) {
    const event = $.Event('alteditor-' + name + '.dt');
    event.dt = editor.api();
    try {
      $(editor.api().table().node()).trigger(event, [
        Object.assign({ editor }, payload),
      ]);
    } catch (error) {
      if (name === 'before-open' || name.endsWith('pre-submit'))
        event.preventDefault();
      console.error('AltEditor event handler failed:', name, error);
    }
    return !event.isDefaultPrevented();
  }

  const forbidden = ['__proto__', 'prototype', 'constructor'];

  function segments(path) {
    if (typeof path !== 'string' && typeof path !== 'number')
      throw new Error('Invalid field path');
    const keys = String(path).split('.');
    if (keys.some((key) => !key || forbidden.indexOf(key) !== -1))
      throw new Error('Unsafe or invalid field path: ' + path);
    return keys;
  }

  function readPath(source, path) {
    return segments(path).reduce(
      (value, key) => (value == null ? undefined : value[key]),
      source
    );
  }

  function isFieldPath(path) {
    try {
      segments(path);
      return !/[\[\]()\\]/.test(String(path));
    } catch (_error) {
      return false;
    }
  }

  function copyProperties(source) {
    const result = {};
    Object.keys(source || {}).forEach((key) => {
      Object.defineProperty(result, key, {
        value: source[key],
        enumerable: true,
        writable: true,
        configurable: true,
      });
    });
    return result;
  }

  function writePath(target, path, value) {
    const keys = segments(path);
    let cursor = target;
    keys.slice(0, -1).forEach((key, index) => {
      if (!cursor[key] || typeof cursor[key] !== 'object')
        cursor[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
      cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
    return target;
  }

  /** Copy the edited branches so persistence never changes the original row. */
  function withValue(source, path, value) {
    const keys = segments(path);
    const copy = (item) =>
      Array.isArray(item) ? item.slice() : copyProperties(item);
    const result = copy(source);
    let cursor = result;
    let original = source;
    keys.slice(0, -1).forEach((key, index) => {
      original = original == null ? undefined : original[key];
      cursor[key] =
        original && typeof original === 'object'
          ? copy(original)
          : /^\d+$/.test(keys[index + 1])
            ? []
            : {};
      cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
    return result;
  }

  function snapshotRow(row) {
    return {
      rowId: row.id(),
      rowIndex: row.index(),
      rowNode: row.node(),
      originalData: row.data(),
    };
  }

  function resolveRow(api, snapshot) {
    if (!snapshot) return null;
    if (snapshot.rowId !== undefined && snapshot.rowId !== '') {
      try {
        const byId = api.row('#' + snapshot.rowId);
        if (byId.any()) return byId;
      } catch (_error) {
        // A missing identifier can reach DataTables' CSS selector fallback.
      }
    }
    if (
      snapshot.rowNode &&
      snapshot.rowNode.isConnected &&
      snapshot.rowNode.closest('table') === api.table().node()
    ) {
      const byNode = api.row(snapshot.rowNode);
      if (byNode.any() && byNode.data() === snapshot.originalData) return byNode;
    }
    const byIndex = api.row(snapshot.rowIndex);
    return byIndex.any() && byIndex.data() === snapshot.originalData
      ? byIndex
      : null;
  }

  /** Invoke a persistence callback; only its first settlement is accepted. */
  function invoke(callback, editor, values, extra, success, error) {
    let settled = false;
    const accept = (handler) => (value) => {
      if (settled) return;
      settled = true;
      handler(value);
    };
    const resolve = accept(success);
    const reject = accept(error);
    try {
      if (callback)
        callback.apply(
          editor,
          [editor, values, resolve, reject].concat(extra || [])
        );
      else resolve(values);
    } catch (failure) {
      if (settled && editor.debug)
        console.error('Persistence callback failed after completion:', failure);
      reject(failure);
    }
  }

  function cloneRow(value, seen) {
    if (!value || typeof value !== 'object') return value;
    if (value instanceof Date) return new Date(value.getTime());
    const prototype = Object.getPrototypeOf(value);
    if (
      !Array.isArray(value) &&
      prototype !== Object.prototype &&
      prototype !== null
    )
      return value;
    seen = seen || new Map();
    if (seen.has(value)) return seen.get(value);
    const result = Array.isArray(value) ? [] : {};
    seen.set(value, result);
    Object.keys(value).forEach((key) => {
      Object.defineProperty(result, key, {
        value: cloneRow(value[key], seen),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    });
    return result;
  }

  /** Clone application markup and place generated fields into named slots. */
  function applyTemplate(source, fields, context) {
    if (typeof source === 'function') source = source(context);
    if (source == null) return fields;
    if (typeof source === 'string') source = document.querySelector(source);
    if (!source || ![1, 11].includes(source.nodeType))
      throw new TypeError(
        'Dialog template must resolve to an element or fragment'
      );
    const layout = document.createElement('div');
    layout.className = 'altEditor-template';
    layout.appendChild((source.content || source).cloneNode(true));
    if (layout.querySelector('form, input, select, textarea, [contenteditable]'))
      throw new Error(
        'Dialog templates must use field slots instead of form controls'
      );
    const identifiers = new Map();
    layout.querySelectorAll('[id]').forEach((element, index) => {
      if (identifiers.has(element.id))
        throw new Error('Duplicate dialog template identifier: ' + element.id);
      const id = context.editor.random_id + '-template-' + index;
      identifiers.set(element.id, id);
      element.id = id;
    });
    layout.querySelectorAll('*').forEach((element) => {
      [
        'for',
        'aria-labelledby',
        'aria-describedby',
        'aria-controls',
        'aria-owns',
      ].forEach((attribute) => {
        if (element.hasAttribute(attribute))
          element.setAttribute(
            attribute,
            element
              .getAttribute(attribute)
              .split(/\s+/)
              .map((id) => identifiers.get(id) || id)
              .join(' ')
          );
      });
      const href = element.getAttribute('href');
      if (href && href[0] === '#' && identifiers.has(href.slice(1)))
        element.setAttribute('href', '#' + identifiers.get(href.slice(1)));
    });
    const groups = new Map();
    fields.querySelectorAll('.altEditor-field').forEach((field) => {
      const control = field.querySelector('[name]');
      if (control) groups.set(control.name, field);
    });
    layout.querySelectorAll('[data-alteditor-field]').forEach((slot) => {
      const name = slot.getAttribute('data-alteditor-field');
      const field = groups.get(name);
      if (!field || slot.querySelector('[data-alteditor-field]'))
        throw new Error(
          'Unknown, duplicate, or nested dialog field slot: ' + name
        );
      slot.replaceChildren(field);
      groups.delete(name);
    });
    if (groups.size)
      throw new Error(
        'Missing dialog field slots: ' + [...groups.keys()].join(', ')
      );
    fields
      .querySelectorAll('input[type="hidden"]')
      .forEach((field) => layout.appendChild(field));
    return layout;
  }

  /** Render a deletion summary without interpreting strings as HTML. */
  function deletionContent(option, context) {
    if (option === false || option == null) return null;
    const value = typeof option === 'function' ? option(context) : option;
    if (value === false || value == null) return null;
    if (typeof value === 'string') return document.createTextNode(value);
    if (value && [1, 11].includes(value.nodeType)) return value;
    throw new TypeError(
      'Delete details must return text, an element, or a fragment'
    );
  }

  function useNeutralControls(modal) {
    modal
      .find('.altEditor-input .form-control')
      .addClass('altEditor-control')
      .removeClass('form-control form-control-sm');
    modal
      .find('.altEditor-label .col-form-label')
      .removeClass('col-form-label col-form-label-sm');
  }

  function configureDialogFramework(modal, framework, explicitFoundation) {
    if (framework === 'native') return;
    modal.toggleClass('reveal', framework === 'foundation');
    const buttons = modal.find('.altEditor-footer button');
    if (framework === 'foundation') {
      buttons.removeClass('btn btn-default btn-secondary btn-primary btn-danger');
      if (explicitFoundation) {
        modal.removeClass('modal fade');
        modal.find('.modal-dialog').removeClass('modal-dialog modal-lg');
        ['content', 'header', 'title', 'body', 'footer'].forEach((part) =>
          modal.find('.altEditor-' + part).removeClass('modal-' + part)
        );
        useNeutralControls(modal);
      }
      modal
        .find('[data-dismiss], [data-bs-dismiss]')
        .removeAttr('data-dismiss data-bs-dismiss');
    } else {
      buttons.removeClass('button secondary');
      modal.removeAttr('data-reveal');
      modal.find('[data-close]').removeAttr('data-close');
    }
  }

  function renderDialog(modal, options) {
    const useNative = modal.is('dialog');
    modal.find('.altEditor-title').text(options.title);
    modal.find('.altEditor-body').empty().append(options.body);
    modal
      .find('.altEditor-footer')
      .empty()
      .append(
        $('<button/>', {
          type: 'button',
          class: useNative
            ? 'altEditor-button'
            : 'btn btn-default btn-secondary button secondary',
          'data-alteditor-close': '',
          'data-dismiss': 'modal',
          'data-bs-dismiss': 'modal',
          'data-close': '',
          text: options.closeCaption,
        }),
        $('<button/>', {
          type: 'submit',
          class: useNative
            ? 'altEditor-button altEditor-submit'
            : options.destructive
              ? 'btn btn-danger button'
              : 'btn btn-primary button',
          id: options.buttonId,
          form: options.formName,
          text: options.buttonCaption,
        })
      );
    if (useNative) {
      modal
        .find('[data-dismiss], [data-bs-dismiss], [data-close]')
        .removeAttr('data-dismiss data-bs-dismiss data-close');
      useNeutralControls(modal);
    }
    const content = modal.find('.altEditor-content');
    if (!content.parent().is('form'))
      content.wrap($('<form/>', { role: 'form' }));
    content
      .parent()
      .attr({ name: options.formName, id: options.formName })
      .toggleClass('needs-validation', !useNative);
  }

  function createDialogShell(modalId, useNative, closeCaption) {
    const titleId = modalId + '-title';
    const bodyId = modalId + '-body';
    var modal = document.createElement(useNative ? 'dialog' : 'div');
    modal.className = useNative
      ? 'altEditor-modal altEditor-native'
      : 'modal fade altEditor-modal reveal';
    if (!useNative) modal.style.display = 'none';
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
    dialog.className = useNative ? 'altEditor-dialog' : 'modal-dialog modal-lg';
    var content = document.createElement('div');
    content.className = 'altEditor-content' + (useNative ? '' : ' modal-content');
    var header = document.createElement('div');
    header.className = 'altEditor-header' + (useNative ? '' : ' modal-header');
    var title = document.createElement('h4');
    title.className = 'altEditor-title' + (useNative ? '' : ' modal-title');
    title.id = titleId;
    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'altEditor-close';
    closeButton.setAttribute('data-dismiss', 'modal');
    closeButton.setAttribute('data-bs-dismiss', 'modal');
    closeButton.setAttribute('data-close', '');
    closeButton.setAttribute('aria-label', closeCaption);
    var closeGlyph = document.createElement('span');
    closeGlyph.setAttribute('aria-hidden', 'true');
    closeGlyph.textContent = '×';
    closeButton.appendChild(closeGlyph);
    header.appendChild(title);
    header.appendChild(closeButton);

    var body = document.createElement('div');
    body.className = 'altEditor-body' + (useNative ? '' : ' modal-body');
    body.id = bodyId;
    var footer = document.createElement('div');
    footer.className = 'altEditor-footer' + (useNative ? '' : ' modal-footer');

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    dialog.appendChild(content);
    modal.appendChild(dialog);
    if (useNative) {
      [modal, closeButton].forEach((node) => {
        [...node.attributes]
          .filter((attr) => attr.name.startsWith('data-'))
          .forEach((attr) => node.removeAttribute(attr.name));
      });
    }
    return modal;
  }

  /** Translate framework notifications into editor lifecycle operations. */
  function bindDialogEvents(editor, $modal) {
    const useNative = $modal.is('dialog');
    $modal.on(
      'shown.bs.modal' +
        editor.s.namespace +
        ' open.zf.reveal' +
        editor.s.namespace,
      function () {
        editor._focusFirstInput();
      }
    );
    $modal.on('submit' + editor.s.namespace, 'form', function (event) {
      event.preventDefault();
    });
    if (useNative) {
      $modal.on(
        'close' +
          editor.s.namespace +
          ' alteditor-native-closed' +
          editor.s.namespace,
        function () {
          if (!this.open) editor._handleDialogClosed();
        }
      );
      $modal.on('cancel' + editor.s.namespace, function (event) {
        event.preventDefault();
      });
      $modal.on(
        'click' + editor.s.namespace,
        '.altEditor-close, [data-alteditor-close]',
        function () {
          if (!editor._submitting)
            editor.internalCloseDialog(editor.modal_selector);
        }
      );
    }
    $modal.on('hidden.bs.modal' + editor.s.namespace, () =>
      editor._handleDialogClosed()
    );
    $modal.on('hide.bs.modal' + editor.s.namespace, function (event) {
      if (editor._submitting && !editor._destroyed) event.preventDefault();
      else editor._closing = true;
    });
    $modal.on('closed.zf.reveal' + editor.s.namespace, function () {
      editor._handleDialogClosed();
    });
  }

  function available$2() {
    return (
      !!(
        root.bootstrap &&
        root.bootstrap.Modal &&
        root.bootstrap.Modal.getOrCreateInstance
      ) || typeof $.fn.modal === 'function'
    );
  }
  function show$2(element) {
    if (!$(element).hasClass('show') && !$(element).hasClass('in')) {
      element._altEditorShowing = true;
      $(element)
        .off('shown.bs.modal.altEditorAdapter')
        .one('shown.bs.modal.altEditorAdapter', () => {
          element._altEditorShowing = false;
          if (element._altEditorClosePending) {
            element._altEditorClosePending = false;
            hide$2(element);
          }
        });
    }
    if (
      root.bootstrap &&
      root.bootstrap.Modal &&
      root.bootstrap.Modal.getOrCreateInstance
    )
      root.bootstrap.Modal.getOrCreateInstance(element).show();
    else $(element).modal('show');
  }
  function hide$2(element) {
    if (element._altEditorShowing) {
      element._altEditorClosePending = true;
      return;
    }
    if (
      root.bootstrap &&
      root.bootstrap.Modal &&
      root.bootstrap.Modal.getOrCreateInstance
    )
      root.bootstrap.Modal.getOrCreateInstance(element).hide();
    else $(element).modal('hide');
  }
  function dispose$2(element) {
    $(element).off('.altEditorAdapter');
    element._altEditorShowing = false;
    element._altEditorClosePending = false;
    element.classList.remove('fade');
    hide$2(element);
    if (
      root.bootstrap &&
      root.bootstrap.Modal &&
      root.bootstrap.Modal.getOrCreateInstance
    ) {
      const modal = root.bootstrap.Modal.getInstance(element);
      if (modal) modal.dispose();
    } else {
      const modal = $(element).data('bs.modal');
      if (modal && typeof modal.dispose === 'function') modal.dispose();
      else $(element).off('.bs.modal').removeData('bs.modal');
    }
  }

  var bootstrap = /*#__PURE__*/Object.freeze({
    __proto__: null,
    available: available$2,
    dispose: dispose$2,
    hide: hide$2,
    show: show$2
  });

  function available$1() {
    return !!(root.Foundation && root.Foundation.Reveal);
  }
  function show$1(element) {
    if (!element._altEditorReveal)
      element._altEditorReveal = new root.Foundation.Reveal($(element), {
        closeOnClick: false,
        closeOnEsc: false,
      });
    element._altEditorReveal.open();
  }
  function hide$1(element) {
    if (element._altEditorReveal) element._altEditorReveal.close();
  }
  function dispose$1(element) {
    if (element._altEditorReveal) {
      element._altEditorReveal.destroy();
      delete element._altEditorReveal;
    }
  }

  var foundation = /*#__PURE__*/Object.freeze({
    __proto__: null,
    available: available$1,
    dispose: dispose$1,
    hide: hide$1,
    show: show$1
  });

  function available(element) {
    return typeof element.showModal === 'function';
  }
  function show(element) {
    element.showModal();
  }
  function hide(element) {
    element.close();
    $(element).trigger('alteditor-native-closed');
  }
  function dispose(element) {
    if (element.open) element.close();
  }

  var native = /*#__PURE__*/Object.freeze({
    __proto__: null,
    available: available,
    dispose: dispose,
    hide: hide,
    show: show
  });

  const adapters = [
    { name: 'bootstrap', api: bootstrap },
    { name: 'foundation', api: foundation },
    { name: 'native', api: native },
  ];

  function selectAdapter(framework, element) {
    return adapters.find(
      ({ name, api }) =>
        (framework === 'auto' ? name !== 'native' : name === framework) &&
        api.available(element)
    );
  }

  const defaults = {
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
      editSelection: 'Exactly one row must be selected for editing.',
      deleteSelection: 'At least one row must be selected for deletion.',
      targetUnavailable: 'Target row is unavailable',
      invalidResponse: 'Persistence must return a row object or array',
      invalidSetter: 'inlineEditSetValue must return a row object or array',
      fileRead: 'Failed to read file',
      fileAborted: 'File read was aborted',
      fileSize: 'File exceeds the configured size limit',
      dialogFramework:
        'Bootstrap Modal or Foundation Reveal is required to open AltEditor dialogs',
      nativeDialog:
        'Native dialogs require a browser with HTMLDialogElement.showModal support',
    },
  };

  function resolveLanguage(input) {
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
    return language;
  }

  function fieldElement(container, name) {
    return $(container)
      .find('input, select, textarea')
      .filter(function () {
        return (this.name || this.id) === String(name);
      });
  }

  function equalFieldValues(left, right, type) {
    const values = (value) => (Array.isArray(value) ? value : [value]);
    return values(left).some((a) =>
      values(right).some((b) => {
        if (a === '' || a == null || b === '' || b == null) return false;
        if (type === 'number')
          return (
            Number.isFinite(Number(a)) &&
            Number.isFinite(Number(b)) &&
            Number(a) === Number(b)
          );
        return String(a) === String(b);
      })
    );
  }

  function normalizeSelectOptions(options) {
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
  }

  function isChecked(value) {
    return (
      value === true ||
      value === 1 ||
      ['true', '1', 'yes', 'on'].indexOf(String(value).toLowerCase()) !== -1
    );
  }

  /** Preserve stored selections that are absent from the configured options. */
  function setSelectValue(control, value) {
    let values = value == null ? [] : Array.isArray(value) ? value : [value];
    const available = new Set(
      Array.from(control.options, (option) => option.value)
    );
    if (control.multiple && typeof value === 'string' && !available.has(value)) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) values = parsed;
      } catch (_error) {}
    }
    values = values.map(String);
    values.forEach((value) => {
      if (value !== '' && !available.has(value)) {
        const option = control.ownerDocument.createElement('option');
        option.value = value;
        option.textContent = value;
        control.appendChild(option);
        available.add(value);
      }
    });
    $(control).val(control.multiple ? values : values.length ? values[0] : '');
  }

  const methods$5 = {
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

  const methods$4 = {
    _collectFormData: function ($form) {
      var that = this;
      var columns = this.columnDefs || this.completeColumnDefs();
      var values = columns.every(function (column) {
        return typeof column.name === 'number';
      })
        ? []
        : {};
      var fileTasks = [];

      $form.find('select, textarea, input').each(function () {
        if (this.disabled) return;
        var $input = $(this);
        var id = this.name || this.id;
        if (!id) return;
        var type = String($input.attr('type') || '').toLowerCase();

        if (type === 'file') {
          var files = $input.prop('files');
          var file = files && files[0];
          if (!file) return;
          const column = columns.find((item) => String(item.name) === id);
          if (
            column &&
            column.maxFileSize !== undefined &&
            (!Number.isFinite(column.maxFileSize) ||
              column.maxFileSize < 0 ||
              file.size > column.maxFileSize)
          )
            throw new Error(that.language.error.fileSize);
          if (that.encodeFiles) {
            fileTasks.push(function () {
              return new Promise(function (resolve, reject) {
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
                  reject
                );
              });
            });
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

      return Promise.all(
        fileTasks.map(function (readFile) {
          return readFile();
        })
      ).then(function () {
        return values;
      });
    },
    _validateFormData: function ($form) {
      var errors = [];
      $form.find('select, textarea, input').each(function () {
        if (this.disabled) return;
        var $input = $(this);
        var id = this.name || this.id || 'field';
        if ($input.attr('data-unique') === 'true') {
          $input.trigger($input.is('select') ? 'change' : 'input');
        }
        if (typeof this.checkValidity === 'function' && !this.checkValidity()) {
          errors.push(this.validationMessage || id + ' is invalid');
        }
      });
      return Array.from(new Set(errors));
    },
    getBase64: function (file, onSuccess, onError) {
      var language = this.language.error;
      var reader = new root.FileReader();
      reader.onload = function () {
        if (onSuccess) onSuccess(reader.result);
      };
      reader.onerror = function () {
        var error = reader.error || new Error(language.fileRead);
        if (onError) onError(error);
      };
      reader.onabort = function () {
        if (onError) onError(new Error(language.fileAborted));
      };
      try {
        reader.readAsDataURL(file);
      } catch (error) {
        if (onError) onError(error);
      }
    },
  };

  /** Build detached field controls without opening a dialog or initializing plugins. */
  function renderFields(columnDefs, instanceId) {
    var fragment = document.createDocumentFragment();
    var container = document.createElement('div');
    container.className = 'altEditor-fields';
    var row = document.createElement('div');
    row.className = 'altEditor-field-list';
    var col = document.createElement('div');
    col.className = 'altEditor-field-content';
    row.appendChild(col);
    container.appendChild(row);
    fragment.appendChild(container);

    var inlineCount = 0;

    columnDefs.forEach(function (columnDef, index) {
      var fieldId = instanceId + '-field-' + index;
      var title = String(columnDef.title || '').trim();
      if (!isFieldPath(columnDef.name) || columnDef.type === 'radio') return;

      if (String(columnDef.type).indexOf('hidden') >= 0) {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = fieldId;
        setElementAttributes(hidden, columnDef, ['name', 'disabled']);
        if (columnDef.value !== undefined && columnDef.value !== null)
          hidden.value = columnDef.value;
        col.appendChild(hidden);
        return;
      }

      if (!title || columnDef.editable === false) return;

      var formGroup = document.createElement('div');
      formGroup.className =
        'altEditor-field' + (columnDef.visible === false ? ' nonDisplay' : '');
      formGroup.id = fieldId + '-row';

      if (!columnDef.inline || inlineCount === 0) {
        var labelCol = document.createElement('div');
        labelCol.className = 'altEditor-label';
        var label = document.createElement('label');
        label.className = 'col-form-label col-form-label-sm';
        label.htmlFor = fieldId;
        label.textContent = title + ':';
        labelCol.appendChild(label);
        formGroup.appendChild(labelCol);
      }

      var inputCol = document.createElement('div');
      inputCol.className =
        'altEditor-input' + (columnDef.inline ? ' altEditor-input-compact' : '');
      formGroup.appendChild(inputCol);

      var type = String(columnDef.type || 'text');
      if (type.indexOf('select') >= 0) {
        var select = document.createElement('select');
        select.className =
          'form-control form-control-sm' + (columnDef.select2 ? ' select2' : '');
        select.id = fieldId;
        setElementAttributes(select, columnDef, [
          'name',
          'style',
          'disabled',
          'required',
          'multiple',
        ]);
        select.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
        if (columnDef.placeholder != null)
          select.setAttribute('data-placeholder', String(columnDef.placeholder));

        var normalized = normalizeSelectOptions(columnDef.options);
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
        textarea.className = 'form-control form-control-sm';
        textarea.id = fieldId;
        setElementAttributes(textarea, columnDef, [
          'name',
          'style',
          'rows',
          'cols',
          'maxLength',
          'readonly',
          'disabled',
          'required',
        ]);
        textarea.placeholder = String(
          columnDef.placeholder == null ? title : columnDef.placeholder
        );
        textarea.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
        if (columnDef.value !== undefined && columnDef.value !== null)
          textarea.value = columnDef.value;
        inputCol.appendChild(textarea);
      } else {
        var input = document.createElement('input');
        input.className =
          'form-control form-control-sm' +
          (columnDef.readonly ? ' readonlyText' : '');
        input.id = fieldId;
        input.title = String(columnDef.hoverMsg || '');
        input.placeholder = String(
          columnDef.placeholder == null ? title : columnDef.placeholder
        );
        input.setAttribute('data-unique', columnDef.unique ? 'true' : 'false');
        setElementAttributes(input, columnDef, [
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

      if (columnDef.inline && inlineCount > 0) {
        inputCol
          .querySelector('input, select, textarea')
          .setAttribute('aria-label', title);
      }
      col.appendChild(formGroup);
      inlineCount++;
    });

    return fragment;
  }

  function setElementAttributes(element, columnDef, attributes) {
    if (columnDef.special !== undefined)
      element.setAttribute('data-special', String(columnDef.special));
    attributes.forEach(function (attribute) {
      var value = columnDef[attribute];
      if (value === undefined || value === null || value === false) return;
      if (['disabled', 'readonly', 'required', 'multiple'].includes(attribute)) {
        if (value) element.setAttribute(attribute, '');
        return;
      }
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
  }

  const methods$3 = {
    _normalizeOptions: normalizeSelectOptions,
    _setElementAttributes: setElementAttributes,
  };

  const methods$2 = {
    createDialog: function (
      columnDefs,
      modalTitle,
      buttonCaption,
      closeCaption,
      buttonClass,
      formName
    ) {
      this.columnDefs = columnDefs;
      const fields = renderFields(columnDefs, this.random_id);
      const body = applyTemplate(
        this.c.dialog.templates[buttonClass === 'addRowBtn' ? 'add' : 'edit'],
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
          buttonId: buttonClass,
          formName: formName + '-' + this.random_id,
        });
      if (this.internalOpenDialog(this.modal_selector, fill) === false)
        return false;
      this._initializePlugins();
      return true;
    },
    _openFormDialog: function (action, rowData) {
      try {
        const columns = this.completeColumnDefs();
        if (
          this.createDialog(
            columns,
            this.language[action].title,
            this.language[action].button,
            this.language.modalClose,
            action + 'RowBtn',
            'altEditor-' + action + '-form'
          ) === false
        )
          return false;
        this._populateDialogFields(columns, rowData);
        this._finishDialogOpening(action);
      } catch (error) {
        return this._abortDialogOpening(error);
      }
    },
    _populateDialogFields: function (columns, rowData) {
      for (const column of columns) {
        if (this._destroyed) return;
        if (!isFieldPath(column.name) || column.editable === false) continue;
        const value =
          rowData === undefined
            ? column.value
            : this._getValueByPath(rowData, column.name);
        if (rowData === undefined && value == null) continue;
        const element = fieldElement(this.modal_selector, column.name).filter(
          ':input[type!="file"]'
        );
        if (!element.length) continue;
        this._setFieldValue(element, column, value);
        element.trigger('change');
      }
    },
  };

  const methods$1 = {
    _initializePlugins: function () {
      if (!this.columnDefs || !Array.isArray(this.columnDefs)) return;
      var that = this;
      var selector = this.modal_selector;

      this.columnDefs.forEach(function (columnDef) {
        if (
          typeof columnDef.name !== 'string' &&
          typeof columnDef.name !== 'number'
        )
          return;
        var $element = fieldElement(selector, columnDef.name);
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
          const config = $.extend({}, columnDef.datetimepicker);
          config.className =
            (config.className ? config.className + ' ' : '') +
            'altEditor-datetimepicker';
          $element.datetimepicker(config);
          $element.attr('data-alteditor-datetimepicker', 'true');
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
            } catch (error) {
              console.warn('AltEditor could not destroy Select2', error);
            }
          });
      }
      if (typeof $.fn.datepicker === 'function') {
        $(selector)
          .find('.hasDatepicker')
          .each(function () {
            try {
              $(this).datepicker('destroy');
            } catch (error) {
              console.warn('AltEditor could not destroy the date picker', error);
            }
          });
      }
      if (typeof $.fn.datetimepicker === 'function')
        $(selector)
          .find('[data-alteditor-datetimepicker]')
          .each(function () {
            try {
              const picker = $(this).data('DateTimePicker');
              if (picker && picker.destroy) picker.destroy();
              else $(this).datetimepicker('destroy');
            } catch (error) {
              console.warn(
                'AltEditor could not destroy the date/time picker',
                error
              );
            }
            $(this).removeAttr('data-alteditor-datetimepicker');
          });
      $(selector).find('[alt-editor-id]').off(this.s.modalNamespace);
    },
    _setFieldValue: function ($element, columnDef, value) {
      if (!$element || !$element.length) return;
      var type = String(columnDef.type || 'text');
      var normalized = value === null || value === undefined ? '' : value;

      if (type.indexOf('select') >= 0) {
        $element.each(function () {
          setSelectValue(this, normalized);
        });
        if (columnDef.select2 && $element.hasClass('select2-hidden-accessible')) {
          $element.trigger('change');
        }
        return;
      }

      if (type.indexOf('checkbox') >= 0) {
        $element.prop('checked', isChecked(normalized));
        return;
      }

      if (
        ['date', 'datetime-local', 'time'].indexOf(type) >= 0 &&
        columnDef.dateFormat &&
        typeof root.moment === 'function'
      ) {
        var date = root.moment(
          String(normalized),
          columnDef.dateInputFormat || root.moment.ISO_8601,
          true
        );
        if (date && date.isValid()) {
          $element.val(date.format(columnDef.dateFormat));
          return;
        }
      }

      $element.val(normalized);
    },
    /** Replace select options while retaining the current value when available.
     * @param {Element|jQuery} $select Select control.
     * @param {Array|Object} options Available values and labels.
     */
    reloadOptions: function ($select, options) {
      $select = $($select);
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
  };

  /** @callback PersistenceCallback
   * @param {Object} editor AltEditor instance.
   * @param {Object|Array} rowData Submitted values; deletion receives an array of rows.
   * @param {Function} success Accept an optional persisted row.
   * @param {Function} error Reject with an error.
   * @param {Object|Array} [originalRowData] Original row for editing.
   */
  const methods = {
    _errorCallback: function (response) {
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

  const types = [
    'text',
    'number',
    'email',
    'date',
    'time',
    'datetime-local',
    'textarea',
    'select',
    'checkbox',
  ];

  function controlOptions(column) {
    if (
      !column ||
      column.readonly ||
      column.disabled ||
      column.type === 'hidden' ||
      column.type === 'file' ||
      column.type === 'readonly'
    )
      return null;
    if (
      column.inlineEditable === false ||
      (column.inlineEditable === undefined && column.editable === false)
    )
      return null;
    if (column.name === null || column.name === undefined) return null;
    if (typeof column.name !== 'number' && typeof column.name !== 'string') {
      if (typeof column.inlineEditSetValue !== 'function') return null;
    } else {
      try {
        segments(column.name);
      } catch (_error) {
        return null;
      }
      if (
        typeof column.name === 'string' &&
        /[\[\]()\\]/.test(column.name) &&
        typeof column.inlineEditSetValue !== 'function'
      )
        return null;
    }
    const options = mergeOptions(column, column.inlineEditOptions);
    options.type = column.inlineEditType || column.type || 'text';
    return types.indexOf(options.type) === -1 ||
      options.readonly ||
      options.disabled
      ? null
      : options;
  }

  function createControl(options, value) {
    const type = options.type;
    const control = document.createElement(
      type === 'select' || type === 'textarea' ? type : 'input'
    );
    if (control.tagName === 'INPUT') control.type = type;
    control.className = 'alteditor-inline-control';
    control.setAttribute('aria-label', options.title || 'Edit value');
    [
      'required',
      'multiple',
      'min',
      'max',
      'step',
      'pattern',
      'maxLength',
      'rows',
      'cols',
      'placeholder',
    ].forEach((key) => {
      if (options[key] != null && options[key] !== false)
        control.setAttribute(
          key,
          options[key] === true ? '' : String(options[key])
        );
    });
    if (type === 'select') {
      let entries = normalizeSelectOptions(options.options);
      if (options.optionsSortByLabel)
        entries = entries
          .slice()
          .sort((a, b) => String(a.label).localeCompare(String(b.label)));
      entries.forEach((entry) => {
        const option = document.createElement('option');
        option.value = String(entry.value);
        option.textContent = String(
          entry.label === undefined ? entry.value : entry.label
        );
        control.appendChild(option);
      });
    }
    if (type === 'checkbox') control.checked = isChecked(value);
    else if (type === 'select') setSelectValue(control, value);
    else control.value = value == null ? '' : value;
    return control;
  }

  function controlValue(control) {
    if (control.type === 'checkbox') return control.checked;
    if (control.type === 'number')
      return Number.isFinite(control.valueAsNumber)
        ? control.valueAsNumber
        : control.value;
    if (control.tagName === 'SELECT' && control.multiple)
      return Array.prototype.filter
        .call(control.options, (option) => option.selected)
        .map((option) => option.value);
    return control.value;
  }

  /** @typedef {Object} InlineEventPayload
   * @property {Object} editor AltEditor instance.
   * @property {number} rowIndex Original DataTables row index.
   * @property {number} columnIndex DataTables column index.
   * @property {*} dataSrc Column data source.
   * @property {*} oldValue Original raw cell value.
   * @property {*} [newValue] Submitted control value.
   * @property {Object|Array} [rowData] Candidate row.
   * @property {Element} cellNode Original cell node.
   * @property {string} [reason] Closing reason.
   * @property {*} [error] Validation or persistence error.
   */

  /** @callback InlinePersistenceCallback
   * @param {Object} editor AltEditor instance.
   * @param {Object|Array} rowData Candidate row.
   * @param {Function} success Accept an optional persisted row.
   * @param {Function} error Reject the update.
   * @param {Object|Array} originalRowData Original row snapshot.
   * @param {InlineEventPayload} meta Cell identity and values.
   */

  class InlineEditor {
    constructor(editor) {
      this.editor = editor;
      this.api = editor.api();
      this.body = this.api.table().body();
      this.session = null;
      this.doubleClick = (event) => {
        const cell = event.target.closest('td, th');
        if (cell && cell.closest('table') === this.api.table().node())
          this.start(cell);
      };
      this.body.addEventListener('dblclick', this.doubleClick);
      this.api.on('preDraw' + editor.s.namespace, () => {
        if (!this.session) return;
        if (this.session.state === 'editing') this.cancel('draw', false);
        else this.detach(this.session);
      });
    }

    payload(session, extra) {
      return Object.assign(
        {
          rowIndex: session.rowIndex,
          columnIndex: session.columnIndex,
          dataSrc: session.dataSrc,
          oldValue: session.oldValue,
          cellNode: session.cellNode,
          newValue: session.newValue,
          rowData: session.candidate,
        },
        extra
      );
    }

    event(name, session, extra) {
      return emit(this.editor, 'inline-' + name, this.payload(session, extra));
    }

    start(selector) {
      if (
        this.editor._destroyed ||
        !this.editor.c.inlineEdit.enabled ||
        this.editor._dialogOpen ||
        (this.session && this.session.state === 'submitting')
      )
        return false;
      let cell;
      try {
        cell = this.api.cell(selector);
      } catch (_error) {
        return false;
      }
      const index = cell.index();
      if (!index || !cell.node() || !this.body.contains(cell.node()))
        return false;
      const column = this.editor.completeColumnDefs()[index.column];
      const options = controlOptions(column);
      if (!options || !this.api.column(index.column).visible()) return false;
      if (this.session && this.session.cellNode === cell.node()) return true;
      if (
        cell.node().isContentEditable ||
        cell
          .node()
          .querySelector(
            'input, select, textarea, button, a[href], summary, audio[controls], video[controls], ' +
              '[tabindex], [contenteditable]:not([contenteditable="false"]), ' +
              '[role="button"], [role="checkbox"], [role="combobox"], [role="link"], ' +
              '[role="radio"], [role="slider"], [role="spinbutton"], [role="switch"], [role="textbox"]'
          )
      )
        return false;
      if (this.session) this.cancel('replace', false);
      const row = this.api.row(index.row);
      const session = Object.assign(snapshotRow(row), {
        columnIndex: index.column,
        dataSrc: column.name,
        oldValue: cell.data(),
        originalRow: cloneRow(row.data()),
        cellNode: cell.node(),
        options,
        state: 'editing',
        composing: false,
        listeners: [],
      });
      session.control = createControl(options, session.oldValue);
      session.errorNode = document.createElement('span');
      session.errorNode.className = 'alteditor-inline-error';
      session.errorNode.id = 'alteditor-error-' + this.editor.random_id;
      session.errorNode.setAttribute('role', 'alert');
      session.control.setAttribute('aria-describedby', session.errorNode.id);
      this.session = session;
      const listen = (name, handler) => {
        session.control.addEventListener(name, handler);
        session.listeners.push([name, handler]);
      };
      listen('compositionstart', () => {
        session.composing = true;
      });
      listen('compositionend', () => {
        session.composing = false;
      });
      listen('keydown', (event) => {
        if (session.composing || event.isComposing || event.keyCode === 229)
          return;
        if (event.key === 'Escape') {
          event.preventDefault();
          this.cancel('escape');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          this.commit();
        } else if (
          event.key === 'Tab' &&
          this.editor.c.inlineEdit.tabNavigation
        ) {
          event.preventDefault();
          this.commit(event.shiftKey ? -1 : 1);
        }
      });
      listen('blur', () => {
        if (
          this.session !== session ||
          session.state !== 'editing' ||
          session.detaching
        )
          return;
        if (this.editor.c.inlineEdit.submitOnBlur) this.commit();
        else this.cancel('blur', false);
      });
      listen('input', () => {
        session.control.setCustomValidity('');
        session.control.removeAttribute('aria-invalid');
        session.errorNode.textContent = '';
      });
      this.attach(session, cell.node());
      this.event('open', session);
      return true;
    }

    attach(session, node) {
      session.display = document.createDocumentFragment();
      while (node.firstChild) session.display.appendChild(node.firstChild);
      session.displayNode = node;
      node.classList.add('alteditor-inline-cell');
      node.appendChild(session.control);
      node.appendChild(session.errorNode);
      session.control.focus();
      if (
        this.editor.c.inlineEdit.selectText &&
        ['text', 'email', 'textarea'].indexOf(session.options.type) !== -1 &&
        session.control.select
      )
        session.control.select();
    }

    detach(session) {
      const node = session.displayNode;
      if (!node) return;
      session.detaching = true;
      if (node.contains(session.control)) {
        session.control.remove();
        session.errorNode.remove();
        node.appendChild(session.display);
      }
      node.classList.remove(
        'alteditor-inline-cell',
        'alteditor-inline-submitting'
      );
      session.displayNode = null;
      session.detaching = false;
    }

    fail(session, error) {
      if (this.session !== session || this.editor._destroyed) return;
      session.state = 'editing';
      session.control.disabled = false;
      session.control.removeAttribute('aria-busy');
      const row = resolveRow(this.api, session);
      if (!row) {
        this.event('error', session, { error });
        this.close(session, 'target-unavailable');
        return;
      }
      const node = this.api.cell(row.index(), session.columnIndex).node();
      if (!session.displayNode && node && this.body.contains(node))
        this.attach(session, node);
      if (session.displayNode)
        session.displayNode.classList.remove('alteditor-inline-submitting');
      session.errorNode.textContent =
        error && error.message
          ? error.message
          : String(error || this.editor.language.error.message);
      session.control.setAttribute('aria-invalid', 'true');
      if (!session.displayNode)
        this.editor._showErrorMessage(session.errorNode.textContent);
      else session.control.focus();
      this.event('error', session, { error });
    }

    commit(direction) {
      const session = this.session;
      if (!session || session.state !== 'editing' || session.composing)
        return false;
      const control = session.control;
      session.newValue = controlValue(control);
      control.setCustomValidity('');
      if (session.options.unique) {
        const row = resolveRow(this.api, session);
        const indexes = this.api.rows().indexes().toArray();
        const duplicate = this.api
          .column(session.columnIndex)
          .data()
          .toArray()
          .some(
            (value, index) =>
              (!row || indexes[index] !== row.index()) &&
              equalFieldValues(session.newValue, value, session.options.type)
          );
        if (duplicate)
          control.setCustomValidity(
            session.options.uniqueMsg || this.editor.language.error.unique
          );
      }
      if (!control.checkValidity()) {
        this.fail(session, new Error(control.validationMessage));
        return false;
      }
      try {
        if (!resolveRow(this.api, session))
          throw new Error(this.editor.language.error.targetUnavailable);
        session.candidate =
          typeof session.options.inlineEditSetValue === 'function'
            ? session.options.inlineEditSetValue(
                cloneRow(session.originalRow),
                session.newValue,
                this.payload(session)
              )
            : withValue(session.originalRow, session.dataSrc, session.newValue);
        if (!session.candidate || typeof session.candidate !== 'object')
          throw new Error(this.editor.language.error.invalidSetter);
      } catch (error) {
        this.fail(session, error);
        return false;
      }
      // Mark submission before events or focus changes can cause a second submission.
      session.state = 'submitting';
      if (!this.event('pre-submit', session)) {
        session.state = 'editing';
        control.focus();
        return false;
      }
      if (this.session !== session || this.editor._destroyed) return false;
      control.disabled = true;
      control.setAttribute('aria-busy', 'true');
      if (session.displayNode)
        session.displayNode.classList.add('alteditor-inline-submitting');
      this.event('submit', session);
      if (this.session !== session || this.editor._destroyed) return false;
      const callback = this.editor.onInlineEditRow || this.editor.onEditRow;
      invoke(
        callback,
        this.editor,
        session.candidate,
        [session.originalRow, this.payload(session)],
        (response) => {
          if (this.session !== session || this.editor._destroyed) return;
          try {
            const row = resolveRow(this.api, session);
            if (!row)
              throw new Error(this.editor.language.error.targetUnavailable);
            const candidate =
              response === undefined
                ? session.candidate
                : this.editor._normalizeResponseData(response);
            if (!candidate || typeof candidate !== 'object')
              throw new Error(this.editor.language.error.invalidResponse);
            const rowIndex = row.index();
            this.release(session);
            this.session = null;
            row.data(candidate).draw(false);
            if (this.editor._destroyed) return;
            this.event('success', session);
            if (this.editor._destroyed) return;
            this.event('close', session, { reason: 'success' });
            if (this.editor._destroyed) return;
            if (
              direction &&
              this.editor.c.inlineEdit.tabNavigation &&
              !this.session
            )
              this.navigate(rowIndex, session.columnIndex, direction);
            else if (!this.session)
              this.focusCell(this.api.cell(rowIndex, session.columnIndex).node());
          } catch (error) {
            if (this.session === session) this.fail(session, error);
            else {
              this.event('error', session, { error });
              this.event('close', session, { reason: 'error' });
            }
          }
        },
        (error) => this.fail(session, error)
      );
      return true;
    }

    navigate(rowIndex, columnIndex, direction) {
      const columns = this.api.columns(':visible').indexes().toArray();
      for (
        let index = columns.indexOf(columnIndex) + direction;
        index >= 0 && index < columns.length;
        index += direction
      ) {
        if (this.start({ row: rowIndex, column: columns[index] })) return;
      }
      this.focusCell(this.api.cell(rowIndex, columnIndex).node());
    }

    focusCell(node) {
      if (node && node.isConnected) {
        if (!node.hasAttribute('tabindex')) node.tabIndex = -1;
        node.focus();
      }
    }
    release(session) {
      session.listeners.forEach((pair) =>
        session.control.removeEventListener(pair[0], pair[1])
      );
      this.detach(session);
    }
    close(session, reason, focus) {
      this.release(session);
      this.session = null;
      if (focus) this.focusCell(session.cellNode);
      this.event('close', session, { reason });
    }
    cancel(reason, focus) {
      const session = this.session;
      if (!session || session.state !== 'editing') return false;
      this.event('cancel', session, { reason: reason || 'cancel' });
      this.close(session, reason || 'cancel', focus !== false);
      return true;
    }
    destroy() {
      this.body.removeEventListener('dblclick', this.doubleClick);
      if (this.session) {
        const session = this.session;
        session.state = 'destroyed';
        this.close(session, 'destroy');
      }
    }
  }

  let instance = 0;
  function createAltEditor(DataTable) {
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
      try {
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
                  console.warn(
                    'AltEditor could not apply the translation',
                    error
                  );
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
      } catch (error) {
        this.destroy();
        throw error;
      }
    }
    Object.assign(
      AltEditor.prototype,
      methods$5,
      methods$2,
      methods$3,
      methods$4,
      methods$1,
      methods,
      {
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
          if (selector !== undefined) {
            try {
              return api.rows(selector);
            } catch (_error) {
              return api.rows(() => false);
            }
          }
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
        /** Refresh Ajax data, or redraw client-side data. */
        refresh: function () {
          if (this._destroyed) return;
          const api = this.api();
          const payload = { action: 'refresh', mode: 'dialog' };
          if (!emit(this, 'pre-submit', payload)) return;
          if (this._destroyed) return;
          emit(this, 'submit', payload);
          if (this._destroyed) return;
          const complete = () => {
            if (!this._destroyed) emit(this, 'success', payload);
          };
          if (api.ajax.url()) api.ajax.reload(complete, false);
          else {
            api.draw(false);
            complete();
          }
        },
        /** Dispose editor-owned listeners, integrations, and dialog elements. */
        destroy: function () {
          if (this._destroyed) return;
          this._destroyed = true;
          if (this._inline) this._inline.destroy();
          this._dialogOpen = false;
          this._dialogShown = false;
          this._opening = false;
          this._closing = false;
          this._dialogContext = null;
          this._editSnapshot = null;
          this._deleteSnapshot = null;
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
      }
    );
    AltEditor.version = '4.1.1';
    AltEditor.defaults = defaults$1;
    AltEditor.classes = { btn: 'btn' };
    return AltEditor;
  }

  function register(DataTable, AltEditor) {
    DataTable.Api.register('altEditor()', function (options) {
      const table = this.table().node();
      if (!table) return null;
      if (table.altEditor && !table.altEditor._destroyed) return table.altEditor;
      return options === undefined ? null : new AltEditor(this, options);
    });
    $(document).on('preInit.dt.altEditor', function (event, settings) {
      if (event.namespace !== 'dt') return;
      const api = new DataTable.Api(settings);
      const option = api.init().altEditor;
      if (option !== false && (option || DataTable.defaults.altEditor)) {
        try {
          api.altEditor(option || {});
        } catch (error) {
          console.error('AltEditor initialization failed', error);
        }
      }
    });
    DataTable.altEditor = AltEditor;
  }

  /**
   * DataTables AltEditor v4.1.1
   * Copyright (c) 2016 Kingkode, KasperOlesen, luca-vercelli, zack-hable
   * Copyright (c) 2026 Ben Situ and contributors
   * SPDX-License-Identifier: MIT
   */

  function initialize(root, jquery) {
    jquery = jquery || ($$1.fn ? $$1 : $$1(root));
    configure(root, jquery);
    const DataTable =
      jquery.fn.dataTable ||
      (DataTables.Api ? DataTables : DataTables(root, jquery));
    if (DataTable.altEditor) return DataTable.altEditor;
    const AltEditor = createAltEditor(DataTable);
    register(DataTable, AltEditor);
    return AltEditor;
  }

  var index = typeof window === 'undefined'
    ? initialize
    : initialize(window, $$1);

  return index;

}));
//# sourceMappingURL=dataTables.altEditor.js.map

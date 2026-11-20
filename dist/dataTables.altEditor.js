/*! DataTables AltEditor v4.3.1
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

  function fieldControls(container) {
    return $(container).find('input, select, textarea');
  }

  function indexFieldControls(container) {
    const controls = new Map();
    fieldControls(container).each(function () {
      const name = this.name || this.id;
      if (!name) return;
      const matching = controls.get(name);
      if (matching) matching.push(this);
      else controls.set(name, [this]);
    });
    return controls;
  }

  function fieldElement(container, name) {
    const fieldName = String(name);
    return fieldControls(container).filter(function () {
      return (this.name || this.id) === fieldName;
    });
  }

  /** Normalize persistence and validation failures without interpreting messages as HTML. */
  function normalizeError(error, language) {
    const fields = [];
    let message = typeof error === 'string' ? error : '';
    if (error && typeof error === 'object') {
      if (typeof error.message === 'string') message = error.message;
      if (error.fieldErrors && typeof error.fieldErrors === 'object') {
        Object.keys(error.fieldErrors).forEach((name) => {
          const value = error.fieldErrors[name];
          if (typeof value === 'string' && value) fields.push([name, value]);
        });
      }
      if (!message && error.responseJSON && error.responseJSON.errors) {
        const messages = [];
        const errors = error.responseJSON.errors;
        const values =
          typeof errors === 'object' ? Object.values(errors) : [errors];
        values.forEach((value) => {
          (Array.isArray(value) ? value : [value]).forEach((item) => {
            if (item != null) messages.push(String(item));
          });
        });
        message = messages.join('\n');
      }
      if (
        !message &&
        error.responseJSON &&
        typeof error.responseJSON.message === 'string'
      )
        message = error.responseJSON.message;
      if (!message && Number.isInteger(error.status))
        message = language.responseCode + error.status;
    }
    return {
      message: message || (fields.length ? '' : language.message),
      fields,
    };
  }

  function clearFieldErrors(editor, name) {
    if (!editor._fieldErrors) return;
    editor._fieldErrors.forEach((entry, key) => {
      if (name !== undefined && key !== String(name)) return;
      entry.controls.forEach(({ element, invalid, styled }) => {
        const ids = (element.getAttribute('aria-describedby') || '')
          .split(/\s+/)
          .filter((id) => id && id !== entry.node.id);
        if (ids.length) element.setAttribute('aria-describedby', ids.join(' '));
        else element.removeAttribute('aria-describedby');
        if (invalid === null) element.removeAttribute('aria-invalid');
        else element.setAttribute('aria-invalid', invalid);
        if (!styled) element.classList.remove('altEditor-field-invalid');
      });
      entry.node.remove();
      editor._fieldErrors.delete(key);
    });
  }

  /** Locate an editable visible control, including the visible Select2 replacement. */
  function feedbackControl(element, modal) {
    if (
      !element ||
      element.disabled ||
      element.readOnly ||
      element.type === 'hidden'
    )
      return null;
    const replacement = $(element).hasClass('select2-hidden-accessible')
      ? $(element).next('.select2-container').find('.select2-selection')[0]
      : null;
    const target = replacement || element;
    for (let node = target; node && node !== modal; node = node.parentElement) {
      const style = root.getComputedStyle(node);
      if (
        node.hidden ||
        style.display === 'none' ||
        style.visibility === 'hidden'
      )
        return null;
    }
    return target;
  }

  function showFieldErrors(editor, error) {
    clearFieldErrors(editor);
    const feedback = normalizeError(error, editor.language.error);
    const messages = feedback.message ? [feedback.message] : [];
    const modal = $(editor.modal_selector)[0];
    let first;
    editor._fieldErrors = new Map();
    feedback.fields.forEach(([name, message]) => {
      const element = fieldElement(modal, name)[0];
      const target = editor._dialogOpen && feedbackControl(element, modal);
      if (!target) {
        messages.push(message);
        return;
      }
      const node = document.createElement('span');
      node.className = 'altEditor-field-error';
      editor._fieldErrorId = (editor._fieldErrorId || 0) + 1;
      node.id = editor._instanceId + '-error-' + editor._fieldErrorId;
      node.setAttribute('role', 'alert');
      node.textContent = message;
      const search = $(element)
        .next('.select2-container')
        .find('.select2-search__field')[0];
      const controls = [
        ...new Set([element, target, search].filter(Boolean)),
      ].map((control) => {
        const state = {
          element: control,
          invalid: control.getAttribute('aria-invalid'),
          styled: control.classList.contains('altEditor-field-invalid'),
        };
        control.setAttribute('aria-invalid', 'true');
        const described = control.getAttribute('aria-describedby');
        control.setAttribute(
          'aria-describedby',
          described ? described + ' ' + node.id : node.id
        );
        control.classList.add('altEditor-field-invalid');
        return state;
      });
      const container = $(element).next('.select2-container')[0] || element;
      container.insertAdjacentElement('afterend', node);
      editor._fieldErrors.set(name, { node, controls });
      if (!first) first = search || target;
    });
    $(modal).find('.altEditor-feedback').remove();
    if (messages.length) editor._showErrorMessage(messages.join('\n'));
    if (first && first.isConnected) first.focus();
  }

  function renderNotice(modal, container, variant, title, message) {
    container.find('.altEditor-feedback').remove();
    const notice = $('<div/>', {
      class: modal.is('dialog')
        ? 'altEditor-feedback'
        : 'altEditor-feedback alert alert-' + variant,
      role: 'alert',
    });
    $('<strong/>').text(title).appendTo(notice);
    if (message) {
      $('<br/>').appendTo(notice);
      $('<span/>')
        .css('white-space', 'pre-line')
        .text(String(message))
        .appendTo(notice);
    }
    container.append(notice);
  }

  const feedbackMethods = {
    _showSuccessMessage() {
      const modal = $(this.modal_selector);
      renderNotice(
        modal,
        modal.find('.altEditor-body'),
        'success',
        this.language.success
      );
    },
    _showErrorMessage(message) {
      const modal = $(this.modal_selector);
      if (!modal.length) {
        if (message) console.error(message);
        return;
      }
      let container = modal.find('.altEditor-body');
      if (!this._dialogOpen) {
        if (!this._message)
          this._message = $('<div/>', {
            class: 'altEditor-message',
          }).insertBefore(this.api().table().node());
        container = this._message;
      }
      renderNotice(
        modal,
        container,
        'danger',
        this.language.error.label,
        message
      );
    },
  };

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]')
      return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
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
   * @property {number} [persistenceTimeout=0] Milliseconds to wait for a persistence callback.
   * @property {Object|boolean} [inlineEdit] Cell editing configuration.
   */
  const defaults$1 = {
    fields: null,
    closeModalOnSuccess: true,
    encodeFiles: true,
    debug: false,
    persistenceTimeout: 0,
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
      persistUnchanged: false,
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
    if (options.fields != null && !Array.isArray(options.fields))
      throw new TypeError('Form fields must be an array');
    if (
      !Number.isInteger(options.persistenceTimeout) ||
      options.persistenceTimeout < 0 ||
      options.persistenceTimeout > 2147483647
    )
      throw new TypeError(
        'Persistence timeout must be an integer between 0 and 2147483647'
      );
    return options;
  }

  const keys =
    'editable visible type readonly disabled required hoverMsg pattern unique uniqueMsg maxLength multiple select2 datepicker datetimepicker editorOnChange editorValidate getValue setValue style dateFormat dateInputFormat optionsSortByLabel inline step min max value options rows cols accept maxFileSize special placeholder inlineEditable inlineEditType inlineEditOptions inlineEditSetValue'.split(
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

  function requireSynchronousResult(result, message) {
    if (result != null && typeof result.then === 'function') {
      Promise.resolve(result).catch(() => {});
      throw new TypeError(message);
    }
    return result;
  }

  const forbidden = ['__proto__', 'prototype', 'constructor'];
  const isContainer = (value) => Array.isArray(value) || isPlainObject(value);

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
    if (!isContainer(target))
      throw new TypeError('Cannot write through a non-object field: ' + path);
    let cursor = target;
    keys.slice(0, -1).forEach((key, index) => {
      if (cursor[key] != null && !isContainer(cursor[key]))
        throw new TypeError('Cannot write through a non-object field: ' + path);
      if (cursor[key] == null)
        cursor[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
      cursor = cursor[key];
    });
    cursor[keys[keys.length - 1]] = value;
    return target;
  }

  /** Copy the edited branches so persistence never changes the original row. */
  function withValue(source, path, value) {
    return withValues(source, [[path, value]]);
  }

  /** Copy each modified row branch once, preserving untouched values. */
  function withValues(source, updates) {
    if (!updates.length) return source;
    const originals = new WeakMap();
    const copy = (original) => {
      const result = Array.isArray(original)
        ? original.slice()
        : copyProperties(original);
      originals.set(result, original);
      return result;
    };
    let result;
    for (const [path, value] of updates) {
      const keys = segments(path);
      if (!result) {
        if (source != null && !isContainer(source))
          throw new TypeError('Cannot write through a non-object field: ' + path);
        result = copy(source);
      }
      let cursor = result;
      for (let index = 0; index < keys.length - 1; index++) {
        const key = keys[index];
        const original = originals.get(cursor);
        // Array slicing omits named properties, which can still be addressed by a path.
        const branch =
          Array.isArray(cursor) &&
          original &&
          !Object.prototype.hasOwnProperty.call(cursor, key)
            ? original[key]
            : cursor[key];
        if (branch == null) {
          const created = /^\d+$/.test(keys[index + 1]) ? [] : {};
          originals.set(created, undefined);
          cursor[key] = created;
        } else {
          if (!isContainer(branch))
            throw new TypeError(
              'Cannot write through a non-object field: ' + path
            );
          if (!originals.has(branch)) cursor[key] = copy(branch);
        }
        cursor = cursor[key];
      }
      cursor[keys[keys.length - 1]] = value;
    }
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

  function validateFieldNames(fields) {
    const names = [];
    fields.forEach((field) => {
      if (!isPlainObject(field) || !isFieldPath(field.name))
        throw new TypeError('Each form field requires a writable name');
      const name = String(field.name);
      if (
        names.some(
          (other) =>
            other === name ||
            other.startsWith(name + '.') ||
            name.startsWith(other + '.')
        )
      )
        throw new TypeError('Form field names must not overlap: ' + name);
      names.push(name);
    });
  }

  function normalizeFields(fields, columns) {
    if (fields == null) {
      validateFieldNames(
        columns.filter(
          (field) =>
            isFieldPath(field.name) &&
            !field.disabled &&
            field.type !== 'radio' &&
            (field.type === 'hidden' ||
              (field.editable !== false && String(field.title || '').trim()))
        )
      );
      return columns;
    }
    validateFieldNames(fields);
    return fields.map((field) => {
      const name = String(field.name);
      ['getValue', 'setValue'].forEach((key) => {
        if (field[key] !== undefined && typeof field[key] !== 'function')
          throw new TypeError(key + ' must be a function');
      });
      const result = Object.assign(
        {
          title: name,
          editable: true,
          visible: true,
          type: 'text',
          rows: 5,
          cols: 30,
          options: [],
        },
        field
      );
      if (result.type === 'readonly') {
        result.type = 'text';
        result.readonly = true;
      }
      if (result.placeholder === undefined) result.placeholder = result.title;
      return result;
    });
  }

  function transformField(
    field,
    method,
    value,
    editor,
    operation,
    originalRowData,
    values
  ) {
    if (field[method] === undefined) return value;
    if (typeof field[method] !== 'function')
      throw new TypeError(method + ' must be a function');
    let originalCopy;
    let copied = false;
    const result = field[method](cloneRow(value), {
      editor,
      field: field.name,
      operation,
      get originalRowData() {
        if (!copied) {
          originalCopy = cloneRow(originalRowData);
          copied = true;
        }
        return originalCopy;
      },
      values: cloneRow(values),
    });
    return requireSynchronousResult(
      result,
      method + ' must return a synchronous value'
    );
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

  /** Invoke a persistence callback; only its first settlement is accepted. */
  function invokePersistence(
    callback,
    editor,
    values,
    extra,
    success,
    error
  ) {
    let settled = false;
    let timer;
    const settle = () => {
      if (settled) return false;
      settled = true;
      if (timer !== undefined) root.clearTimeout(timer);
      if (editor._cancelPersistence === settle) delete editor._cancelPersistence;
      return true;
    };
    const accept = (handler) => (value) => {
      if (settle()) handler(value);
    };
    const resolve = accept(success);
    const reject = accept(error);
    try {
      if (callback) {
        editor._cancelPersistence = settle;
        const timeout = editor.c && editor.c.persistenceTimeout;
        if (timeout > 0)
          timer = root.setTimeout(() => {
            const failure = new Error(editor.language.error.persistenceTimeout);
            failure.name = 'TimeoutError';
            reject(failure);
          }, timeout);
        const result = callback.apply(
          editor,
          [editor, values, resolve, reject].concat(extra || [])
        );
        const then = result != null ? result.then : null;
        if (typeof then === 'function') then.call(result, resolve, reject);
      } else resolve(values);
    } catch (failure) {
      if (settled && editor.debug)
        console.error('Persistence callback failed after completion:', failure);
      reject(failure);
    }
  }

  function cancelPersistence(editor) {
    if (editor._cancelPersistence) editor._cancelPersistence();
  }

  function parsePersistedRow(response) {
    if (typeof response !== 'string') return response;
    const json = response.trim();
    if (json.startsWith('{') || json.startsWith('[')) {
      try {
        return JSON.parse(json);
      } catch (_error) {}
    }
    return response;
  }

  function acceptPersistedRow(response, candidate, errorMessage) {
    const row = response === undefined ? candidate : parsePersistedRow(response);
    if (!row || typeof row !== 'object') throw new Error(errorMessage);
    return row;
  }

  const identifierAttributes = [
    'for',
    'headers',
    'itemref',
    'aria-activedescendant',
    'aria-controls',
    'aria-describedby',
    'aria-details',
    'aria-errormessage',
    'aria-flowto',
    'aria-labelledby',
    'aria-owns',
  ];
  const urlAttributes = [
    'clip-path',
    'fill',
    'filter',
    'marker',
    'marker-end',
    'marker-mid',
    'marker-start',
    'mask',
    'stroke',
    'style',
  ];

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
      const id = context.editor._instanceId + '-template-' + index;
      identifiers.set(element.id, id);
      element.id = id;
    });
    layout.querySelectorAll('*').forEach((element) => {
      identifierAttributes.forEach((attribute) => {
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
      ['href', 'xlink:href'].forEach((attribute) => {
        const node = element.getAttributeNode(attribute);
        if (!node || !node.value.startsWith('#')) return;
        const id = identifiers.get(node.value.slice(1));
        if (id) node.value = '#' + id;
      });
      urlAttributes.forEach((attribute) => {
        const node = element.getAttributeNode(attribute);
        if (node)
          node.value = node.value.replace(
            /url\(\s*(['"]?)#([^'"\s)]+)\1\s*\)/g,
            (match, quote, id) =>
              identifiers.has(id)
                ? 'url(' + quote + '#' + identifiers.get(id) + quote + ')'
                : match
          );
      });
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
          class:
            (useNative
              ? 'altEditor-button'
              : options.destructive
                ? 'btn btn-danger button'
                : 'btn btn-primary button') +
            ' altEditor-submit ' +
            options.buttonId,
          id: modal[0].id + '-' + options.buttonId,
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
      .attr({ name: options.formName, id: options.formName, novalidate: '' })
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
      modal.setAttribute('closedby', 'none');
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
    const animated = element.classList.contains('fade');
    element.classList.remove('fade');
    try {
      if (element.classList.contains('show') || element.classList.contains('in'))
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
    } finally {
      if (animated) element.classList.add('fade');
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
    inline: { label: 'Edit value' },
    error: {
      message: 'There was an unknown error!',
      label: 'Error!',
      responseCode: 'Response code: ',
      required: 'Field is required',
      validation: 'Invalid field value',
      unique: 'Duplicated field',
      editSelection: 'Exactly one row must be selected for editing.',
      deleteSelection: 'At least one row must be selected for deletion.',
      targetUnavailable: 'Target row is unavailable',
      invalidResponse: 'Persistence must return a row object or array',
      invalidSetter: 'inlineEditSetValue must return a row object or array',
      unsupportedInlineValue: 'This value cannot be edited with this control',
      persistenceTimeout:
        'The save did not respond in time. Check the current data before retrying.',
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

  const methods$6 = {
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

  const methods$5 = {
    _collectFormData: function ($form, controls = fieldControls($form)) {
      var that = this;
      var fieldDefinitions =
        this._dialogFieldDefinitions || this.completeFieldDefs();
      var values = fieldDefinitions.every(function (field) {
        return typeof field.name === 'number';
      })
        ? []
        : {};
      var fileTasks = [];

      controls.each(function () {
        if (this.disabled) return;
        var $input = $(this);
        var id = this.name || this.id;
        if (!id) return;
        var type = String($input.attr('type') || '').toLowerCase();

        if (type === 'file') {
          var files = $input.prop('files');
          var file = files && files[0];
          if (!file) return;
          const field = fieldDefinitions.find((item) => String(item.name) === id);
          if (
            field &&
            field.maxFileSize !== undefined &&
            (!Number.isFinite(field.maxFileSize) ||
              field.maxFileSize < 0 ||
              file.size > field.maxFileSize)
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
    _validateFormData: function ($form, fieldErrors) {
      var that = this;
      var errors = [];
      fieldControls($form).each(function () {
        if (this.disabled) return;
        var $input = $(this);
        var id = this.name || this.id || 'field';
        if ($input.attr('data-unique') === 'true') {
          that._validateUniqueField(this);
        }
        if (typeof this.checkValidity === 'function' && !this.checkValidity()) {
          const message =
            this.validationMessage || that.language.error.validation;
          errors.push(message);
          if (fieldErrors) fieldErrors[id] = message;
        }
      });
      return Array.from(new Set(errors));
    },
    getBase64: function (file, onSuccess, onError) {
      var language = this.language.error;
      var reader = new root.FileReader();
      if (!this._fileReaders) this._fileReaders = new Set();
      const readers = this._fileReaders;
      readers.add(reader);
      const finish = (callback, result) => {
        readers.delete(reader);
        reader.onload = reader.onerror = reader.onabort = null;
        if (callback) callback(result);
      };
      reader.onload = function () {
        finish(onSuccess, reader.result);
      };
      reader.onerror = function () {
        var error = reader.error || new Error(language.fileRead);
        finish(onError, error);
      };
      reader.onabort = function () {
        finish(onError, new Error(language.fileAborted));
      };
      try {
        reader.readAsDataURL(file);
      } catch (error) {
        finish(onError, error);
      }
    },
    _abortFileReads: function () {
      if (!this._fileReaders) return;
      Array.from(this._fileReaders).forEach((reader) => {
        try {
          reader.abort();
        } catch (error) {
          console.warn('AltEditor could not stop file reading', error);
        }
      });
      this._fileReaders.clear();
    },
  };

  function createSelectOption(select, value, label) {
    const option = select.ownerDocument.createElement('option');
    option.value = String(value);
    option.textContent = String(label);
    return option;
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
        control.appendChild(createSelectOption(control, value, value));
        available.add(value);
      }
    });
    $(control).val(control.multiple ? values : values.length ? values[0] : '');
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

  /** Build detached field controls without opening a dialog or initializing plugins. */
  function renderFields(fieldDefinitions, instanceId) {
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

    fieldDefinitions.forEach(function (field, index) {
      var fieldId = instanceId + '-field-' + index;
      var title = String(field.title || '').trim();
      if (!isFieldPath(field.name) || field.type === 'radio') return;

      if (field.type === 'hidden') {
        var hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.id = fieldId;
        setElementAttributes(hidden, field, ['name', 'disabled']);
        if (field.value !== undefined && field.value !== null)
          hidden.value = field.value;
        col.appendChild(hidden);
        return;
      }

      if (!title || field.editable === false) return;

      var formGroup = document.createElement('div');
      formGroup.className =
        'altEditor-field' + (field.visible === false ? ' nonDisplay' : '');
      formGroup.id = fieldId + '-row';

      if (!field.inline || inlineCount === 0) {
        var labelCol = document.createElement('div');
        labelCol.className = 'altEditor-label';
        var label = document.createElement('label');
        label.className = 'col-form-label col-form-label-sm';
        label.htmlFor = fieldId;
        label.id = fieldId + '-label';
        label.textContent = title + ':';
        labelCol.appendChild(label);
        formGroup.appendChild(labelCol);
      }

      var inputCol = document.createElement('div');
      inputCol.className =
        'altEditor-input' + (field.inline ? ' altEditor-input-compact' : '');
      formGroup.appendChild(inputCol);

      var type = String(field.type || 'text');
      if (type === 'select') {
        var select = document.createElement('select');
        select.className =
          'form-control form-control-sm' + (field.select2 ? ' select2' : '');
        select.id = fieldId;
        setElementAttributes(select, field, [
          'name',
          'style',
          'disabled',
          'required',
          'multiple',
        ]);
        select.setAttribute('data-unique', field.unique ? 'true' : 'false');
        if (field.placeholder != null)
          select.setAttribute('data-placeholder', String(field.placeholder));

        var normalized = normalizeSelectOptions(field.options);
        normalized.forEach(function (option) {
          const optionElement = createSelectOption(
            select,
            option.value,
            option.label
          );
          if (optionElement.value === String(field.value))
            optionElement.selected = true;
          select.appendChild(optionElement);
        });
        inputCol.appendChild(select);
      } else if (type === 'textarea') {
        var textarea = document.createElement('textarea');
        textarea.className = 'form-control form-control-sm';
        textarea.id = fieldId;
        setElementAttributes(textarea, field, [
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
          field.placeholder == null ? title : field.placeholder
        );
        textarea.setAttribute('data-unique', field.unique ? 'true' : 'false');
        if (field.value !== undefined && field.value !== null)
          textarea.value = field.value;
        inputCol.appendChild(textarea);
      } else {
        var input = document.createElement('input');
        input.className =
          'form-control form-control-sm' +
          (field.readonly ? ' readonlyText' : '');
        input.id = fieldId;
        input.title = String(field.hoverMsg || '');
        input.placeholder = String(
          field.placeholder == null ? title : field.placeholder
        );
        input.setAttribute('data-unique', field.unique ? 'true' : 'false');
        setElementAttributes(input, field, [
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
        if (field.value !== undefined && field.value !== null)
          input.value = field.value;
        inputCol.appendChild(input);
      }

      if (field.inline && inlineCount > 0) {
        inputCol
          .querySelector('input, select, textarea')
          .setAttribute('aria-label', title);
      }
      col.appendChild(formGroup);
      inlineCount++;
    });

    return fragment;
  }

  function setElementAttributes(element, field, attributes) {
    if (field.special !== undefined)
      element.setAttribute('data-special', String(field.special));
    attributes.forEach(function (attribute) {
      var value = field[attribute];
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

  const methods$4 = {
    _normalizeOptions: normalizeSelectOptions,
    _setElementAttributes: setElementAttributes,
  };

  const methods$3 = {
    createDialog: function (
      fieldDefinitions,
      modalTitle,
      buttonCaption,
      closeCaption,
      buttonId,
      formName,
      action = buttonId === 'addRowBtn' ? 'add' : 'edit'
    ) {
      clearFieldErrors(this);
      this._dialogFieldDefinitions = fieldDefinitions;
      const fields = renderFields(fieldDefinitions, this._instanceId);
      const body = applyTemplate(
        this.c.dialog.templates[action],
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
          buttonId,
          formName: formName + '-' + this._instanceId,
        });
      if (this.internalOpenDialog(this.modal_selector, fill) === false)
        return false;
      this._initializePlugins();
      return true;
    },
    _openFormDialog: function (action, rowData) {
      try {
        const fieldDefinitions = this.completeFieldDefs();
        if (
          this.createDialog(
            fieldDefinitions,
            this.language[action].title,
            this.language[action].button,
            this.language.modalClose,
            action + 'RowBtn',
            'altEditor-' + action + '-form',
            action
          ) === false
        )
          return false;
        this._populateDialogFields(fieldDefinitions, rowData);
        this._finishDialogOpening(action);
      } catch (error) {
        return this._abortDialogOpening(error);
      }
    },
    _populateDialogFields: function (fieldDefinitions, rowData) {
      const modal = $(this.modal_selector)[0];
      const controlsByName = indexFieldControls(modal);
      for (const field of fieldDefinitions) {
        if (this._destroyed) return;
        if (!isFieldPath(field.name) || field.editable === false) continue;
        const name = String(field.name);
        const indexed = controlsByName.get(name);
        const controls =
          indexed &&
          indexed.some(
            (element) =>
              !modal.contains(element) || (element.name || element.id) !== name
          )
            ? fieldElement(modal, name)
            : $(indexed);
        const stored =
          rowData === undefined
            ? field.value
            : this._getValueByPath(rowData, field.name);
        if (field.type === 'file') {
          if (rowData !== undefined && stored != null && stored !== '')
            controls.prop('required', false);
          continue;
        }
        const element = controls.filter(':input[type!="file"]');
        if (!element.length) continue;
        const value = transformField(
          field,
          'getValue',
          stored,
          this,
          rowData === undefined ? 'add' : 'edit',
          rowData
        );
        if (rowData === undefined && value == null) continue;
        this._setFieldValue(element, field, value, false);
        element.trigger('change');
      }
    },
  };

  const methods$2 = {
    _initializePlugins: function () {
      const fieldDefinitions = this._dialogFieldDefinitions;
      if (!Array.isArray(fieldDefinitions)) return;
      var that = this;
      var selector = this.modal_selector;
      const controlsByName = indexFieldControls(selector);

      fieldDefinitions.forEach(function (field) {
        if (typeof field.name !== 'string' && typeof field.name !== 'number')
          return;
        var $element = $(controlsByName.get(String(field.name)));
        if (!$element.length) return;

        if (field.type === 'select' && field.optionsSortByLabel) {
          var oldValue = $element.val();
          var options = $element.find('option').get();
          options.sort(function (a, b) {
            return $(a).text().localeCompare($(b).text());
          });
          $element.empty().append(options);
          if (oldValue !== undefined && oldValue !== null) $element.val(oldValue);
        }

        if (field.select2) {
          if (typeof $.fn.select2 === 'function') {
            var config =
              typeof field.select2 === 'object'
                ? $.extend({}, field.select2)
                : {};
            config.dropdownParent = $(that.modal_selector);
            $element.select2(config);
            $element.each(function () {
              const container = $(this).next('.select2-container');
              const selection = container.find('.select2-selection');
              const label = this.labels && this.labels[0];
              const name =
                this.getAttribute('aria-label') ||
                String(field.title || field.name);
              if (label && label.id) {
                const described = selection.attr('aria-labelledby');
                selection.attr(
                  'aria-labelledby',
                  label.id + (described ? ' ' + described : '')
                );
              } else
                selection.attr('aria-label', name).removeAttr('aria-labelledby');
              container.find('.select2-search__field').attr('aria-label', name);
              $(this).on('select2:open' + that.s.modalNamespace, function () {
                $(selector)
                  .find('.select2-dropdown .select2-search__field')
                  .attr('aria-label', name);
              });
            });
          }
        } else if (field.datepicker && typeof $.fn.datepicker === 'function') {
          $element.datepicker(field.datepicker);
        } else if (
          field.datetimepicker &&
          typeof $.fn.datetimepicker === 'function'
        ) {
          const config = $.extend({}, field.datetimepicker);
          config.className =
            (config.className ? config.className + ' ' : '') +
            'altEditor-datetimepicker';
          $element.datetimepicker(config);
          $element.attr('data-alteditor-datetimepicker', 'true');
        }

        if (typeof field.editorOnChange === 'function') {
          $element.attr('alt-editor-id', String(field.name));
          $element
            .off('change' + that.s.modalNamespace)
            .on('change' + that.s.modalNamespace, function (event) {
              try {
                field.editorOnChange(event, that);
              } catch (error) {
                if (that._opening) throw error;
                if (that._destroyed) return;
                that._showErrorMessage(
                  normalizeError(error, that.language.error).message
                );
                emit(that, 'error', {
                  action: that._action,
                  mode: 'dialog',
                  field: field.name,
                  error,
                });
              }
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
      $(selector).find('input, select, textarea').off(this.s.modalNamespace);
    },
    _setFieldValue: function ($element, field, value, notifySelect2 = true) {
      if (!$element || !$element.length) return;
      var type = String(field.type || 'text');
      var normalized = value === null || value === undefined ? '' : value;

      if (
        normalized &&
        typeof normalized === 'object' &&
        !(type === 'select' && field.multiple && Array.isArray(normalized))
      ) {
        $element.val('').prop('disabled', true);
        return;
      }

      if (type === 'select') {
        $element.each(function () {
          setSelectValue(this, normalized);
        });
        if (
          notifySelect2 &&
          field.select2 &&
          $element.hasClass('select2-hidden-accessible')
        ) {
          $element.trigger('change');
        }
        return;
      }

      if (type === 'checkbox') {
        $element.prop('checked', isChecked(normalized));
        return;
      }

      if (
        ['date', 'datetime-local', 'time'].indexOf(type) >= 0 &&
        field.dateFormat &&
        typeof root.moment === 'function'
      ) {
        var date = root.moment(
          String(normalized),
          field.dateInputFormat || root.moment.ISO_8601,
          true
        );
        if (date && date.isValid()) {
          $element.val(date.format(field.dateFormat));
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
      $select.each(function () {
        const fragment = this.ownerDocument.createDocumentFragment();
        normalized.forEach(({ value, label }) => {
          fragment.appendChild(
            createSelectOption(
              this,
              value == null ? '' : value,
              label == null ? '' : label
            )
          );
        });
        this.appendChild(fragment);
      });
      if (oldValue !== undefined && oldValue !== null) $select.val(oldValue);
      $select.trigger('change');
    },
  };

  /** Run each validator once against independent copies of the submission snapshot. */
  function validateFields(
    fields,
    editor,
    values,
    originalRowData,
    operation,
    active
  ) {
    const results = [];
    let asynchronous = false;
    const failure = (error) => {
      const normalized = normalizeError(error, editor.language.error);
      return {
        message: [
          normalized.message,
          ...normalized.fields.map(([, message]) => message),
        ]
          .filter(Boolean)
          .join('\n'),
      };
    };
    fields.forEach((field) => {
      if (!active() || typeof field.validate !== 'function') return;
      const interpret = (result) => {
        if (result === true || result == null) return null;
        if (result === false || typeof result === 'string')
          return {
            field: String(field.name),
            message: result || editor.language.error.validation,
          };
        return failure(
          new TypeError(
            'editorValidate must return true, false, a message, null, or undefined'
          )
        );
      };
      try {
        const result = field.validate(cloneRow(field.value), {
          editor,
          field: field.name,
          values: cloneRow(values),
          originalRowData: cloneRow(originalRowData),
          operation,
        });
        const then = result != null ? result.then : null;
        if (typeof then === 'function') {
          asynchronous = true;
          results.push(
            new Promise((resolve, reject) =>
              then.call(result, resolve, reject)
            ).then(interpret, failure)
          );
        } else results.push(interpret(result));
      } catch (error) {
        results.push(failure(error));
      }
    });
    const combine = (outcomes) => {
      const fieldErrors = Object.create(null);
      const messages = [];
      outcomes.forEach((result) => {
        if (!result) return;
        if (result.field !== undefined)
          fieldErrors[result.field] = result.message;
        else messages.push(result.message);
      });
      return messages.length || Object.keys(fieldErrors).length
        ? { message: messages.join('\n'), fieldErrors }
        : null;
    };
    return asynchronous ? Promise.all(results).then(combine) : combine(results);
  }

  /** @callback PersistenceCallback
   * @param {Object} editor AltEditor instance.
   * @param {Object|Array} rowData Submitted values; deletion receives an array of rows.
   * @param {Function} success Accept an optional persisted row.
   * @param {Function} error Reject with an error.
   * @param {Object|Array} [originalRowData] Original row for editing.
   */
  const methods$1 = {
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
      const fieldDefinitions =
        action === 'delete' ? [] : editor._dialogFieldDefinitions;
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
            throw Object.assign(new Error(), { fieldErrors: nativeErrors });
          const controlsByName = new Map();
          const controls = fieldControls(form);
          controls.each(function () {
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
          validators = fieldDefinitions.filter((field) => {
            if (
              typeof field.editorValidate !== 'function' ||
              field.readonly ||
              field.visible === false ||
              field.editable === false ||
              !fieldNames.has(String(field.name))
            )
              return false;
            const control = controlsByName.get(String(field.name));
            return (
              control &&
              !control.disabled &&
              !control.readOnly &&
              control.type !== 'hidden'
            );
          });
          collection = this._collectFormData(form, controls);
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
              fieldDefinitions.forEach((field) => {
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
                  throw Object.assign(new Error(), {
                    fieldErrors: {
                      [field.name]:
                        normalizeError(error, editor.language.error).message ||
                        editor.language.error.validation,
                    },
                  });
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

  const methods = {
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

  function bindControlEvents(
    session,
    settings,
    { commit, cancel, isCurrent }
  ) {
    const { control, errorNode } = session;
    const clearError = () => {
      control.setCustomValidity('');
      control.removeAttribute('aria-invalid');
      errorNode.textContent = '';
    };
    const listeners = {
      compositionstart() {
        session.composing = true;
      },
      compositionend() {
        session.composing = false;
      },
      keydown(event) {
        if (session.composing || event.isComposing || event.keyCode === 229)
          return;
        if (event.key === 'Escape') {
          event.preventDefault();
          cancel('escape');
        } else if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        } else if (event.key === 'Tab' && settings.tabNavigation) {
          event.preventDefault();
          commit(event.shiftKey ? -1 : 1);
        }
      },
      blur(event) {
        if (!isCurrent() || session.state !== 'editing' || session.detaching)
          return;
        if (!event.relatedTarget && !control.ownerDocument.hasFocus()) return;
        if (settings.submitOnBlur) commit();
        else cancel('blur', false);
      },
      input: clearError,
      change: clearError,
    };
    const entries = Object.entries(listeners);
    entries.forEach(([name, listener]) =>
      control.addEventListener(name, listener)
    );
    return () => {
      entries.forEach(([name, listener]) =>
        control.removeEventListener(name, listener)
      );
    };
  }

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

  function createControl(options, value, label) {
    const type = options.type;
    const control = document.createElement(
      type === 'select' || type === 'textarea' ? type : 'input'
    );
    if (control.tagName === 'INPUT') control.type = type;
    control.className = 'alteditor-inline-control';
    control.setAttribute('aria-label', options.title || label);
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
      const entries = normalizeSelectOptions(options.options);
      if (options.optionsSortByLabel)
        entries.sort((a, b) => String(a.label).localeCompare(String(b.label)));
      entries.forEach((entry) => {
        control.appendChild(
          createSelectOption(
            control,
            entry.value,
            entry.label === undefined ? entry.value : entry.label
          )
        );
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

  function sameControlValue(initial, current) {
    return Array.isArray(initial)
      ? initial.length === current.length &&
          initial.every((value, index) => value === current[index])
      : initial === current;
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

    start(selector, reportUnavailable = true) {
      if (
        this.editor._destroyed ||
        !this.editor.c.inlineEdit.enabled ||
        this.editor._dialogOpen ||
        this.editor._opening ||
        (this.session && this.session.state !== 'editing')
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
      let column;
      let options;
      try {
        column = this.editor.completeColumnDefs()[index.column];
        options = controlOptions(column);
      } catch (error) {
        this.editor._showErrorMessage(error.message);
        emit(this.editor, 'error', { action: 'open', mode: 'inline', error });
        return false;
      }
      if (!options || !this.api.column(index.column).visible()) return false;
      const value = cell.data();
      if (
        value !== null &&
        typeof value === 'object' &&
        !(
          options.type === 'select' &&
          options.multiple &&
          Array.isArray(value)
        ) &&
        typeof options.inlineEditSetValue !== 'function'
      )
        return false;
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
      const control = createControl(
        options,
        value,
        this.editor.language.inline.label
      );
      if (
        ['date', 'time', 'datetime-local', 'number'].includes(options.type) &&
        value != null &&
        value !== '' &&
        control.value === ''
      ) {
        if (reportUnavailable) {
          const error = new Error(
            this.editor.language.error.unsupportedInlineValue
          );
          this.editor._showErrorMessage(error.message);
          emit(this.editor, 'error', { action: 'open', mode: 'inline', error });
        }
        return false;
      }
      if (this.session) {
        this.cancel('replace', false);
        if (
          this.session ||
          this.editor._destroyed ||
          this.editor._dialogOpen ||
          this.editor._opening
        )
          return false;
      }
      if (this.editor._message) this.editor._message.empty();
      const row = this.api.row(index.row);
      const session = Object.assign(snapshotRow(row), {
        columnIndex: index.column,
        dataSrc: column.name,
        oldValue: value,
        initialValue: controlValue(control),
        originalRow: cloneRow(row.data()),
        cellNode: cell.node(),
        options,
        state: 'editing',
        composing: false,
      });
      session.control = control;
      session.errorNode = document.createElement('span');
      session.errorNode.className = 'alteditor-inline-error';
      session.errorNode.id = 'alteditor-error-' + this.editor._instanceId;
      session.errorNode.setAttribute('role', 'alert');
      session.control.setAttribute('aria-describedby', session.errorNode.id);
      this.session = session;
      session.releaseEvents = bindControlEvents(
        session,
        this.editor.c.inlineEdit,
        {
          commit: (direction) => this.commit(direction),
          cancel: (reason, focus) => this.cancel(reason, focus),
          isCurrent: () => this.session === session,
        }
      );
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
      const feedback = normalizeError(error, this.editor.language.error);
      const local = feedback.fields
        .filter(([name]) => name === String(session.dataSrc))
        .map(([, message]) => message);
      const other = feedback.fields
        .filter(([name]) => name !== String(session.dataSrc))
        .map(([, message]) => message);
      session.errorNode.textContent = [feedback.message, ...local, ...other]
        .filter(Boolean)
        .join('\n');
      if (other.length) this.editor._showErrorMessage(other.join('\n'));
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
      if (this.editor._message) this.editor._message.empty();
      session.newValue = controlValue(control);
      if (
        !this.editor.c.inlineEdit.persistUnchanged &&
        !control.validity.badInput &&
        sameControlValue(session.initialValue, session.newValue)
      ) {
        const row = resolveRow(this.api, session);
        this.close(session, 'unchanged', !direction);
        if (row && direction && !this.session && !this.editor._destroyed)
          this.navigate(row.index(), session.columnIndex, direction);
        return true;
      }
      control.setCustomValidity('');
      if (session.options.unique) {
        const row = resolveRow(this.api, session);
        const rowIndex = row ? row.index() : null;
        const indexes = this.api.rows().indexes().toArray();
        const duplicate = this.api
          .column(session.columnIndex)
          .data()
          .toArray()
          .some(
            (value, index) =>
              indexes[index] !== rowIndex &&
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
      if (this.session !== session || this.editor._destroyed) return false;
      // Prevent synchronous setters from starting a second submission.
      session.state = 'submitting';
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
        requireSynchronousResult(
          session.candidate,
          this.editor.language.error.invalidSetter
        );
        if (!session.candidate || typeof session.candidate !== 'object')
          throw new Error(this.editor.language.error.invalidSetter);
      } catch (error) {
        this.fail(session, error);
        return false;
      }
      if (this.session !== session || this.editor._destroyed) return false;
      control.disabled = true;
      control.setAttribute('aria-busy', 'true');
      const active = () => this.session === session && !this.editor._destroyed;
      const validation = validateFields(
        [
          {
            name: session.dataSrc,
            value: session.newValue,
            validate: session.options.editorValidate,
          },
        ],
        this.editor,
        session.candidate,
        session.originalRow,
        'inline-edit',
        active
      );
      const proceed = (error) => {
        if (!active()) return;
        if (error) this.fail(session, error);
        else this.persist(session, direction);
      };
      if (validation && typeof validation.then === 'function')
        validation.then(proceed);
      else proceed(validation);
      return true;
    }

    persist(session, direction) {
      const control = session.control;
      const accepted = this.event('pre-submit', session);
      if (this.session !== session || this.editor._destroyed) return false;
      if (!accepted) {
        session.state = 'editing';
        control.disabled = false;
        control.removeAttribute('aria-busy');
        control.focus();
        return false;
      }
      if (!resolveRow(this.api, session)) {
        this.fail(
          session,
          new Error(this.editor.language.error.targetUnavailable)
        );
        return false;
      }
      control.disabled = true;
      control.setAttribute('aria-busy', 'true');
      if (session.displayNode)
        session.displayNode.classList.add('alteditor-inline-submitting');
      this.event('submit', session);
      if (this.session !== session || this.editor._destroyed) return false;
      const callback = this.editor.onInlineEditRow || this.editor.onEditRow;
      invokePersistence(
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
            const candidate = acceptPersistedRow(
              response,
              session.candidate,
              this.editor.language.error.invalidResponse
            );
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
    }

    navigate(rowIndex, columnIndex, direction) {
      const columns = this.api.columns(':visible').indexes().toArray();
      for (
        let index = columns.indexOf(columnIndex) + direction;
        index >= 0 && index < columns.length;
        index += direction
      ) {
        if (this.start({ row: rowIndex, column: columns[index] }, false)) return;
      }
      this.focusCell(this.api.cell(rowIndex, columnIndex).node());
    }

    focusCell(node) {
      if (node && node.isConnected) {
        if (!node.hasAttribute('tabindex')) {
          node.tabIndex = -1;
          node.addEventListener(
            'blur',
            () => {
              if (node.getAttribute('tabindex') === '-1')
                node.removeAttribute('tabindex');
            },
            { once: true }
          );
        }
        node.focus();
      }
    }
    release(session) {
      session.releaseEvents();
      this.detach(session);
    }
    close(session, reason, focus) {
      if (this.session !== session) return;
      this.session = null;
      this.release(session);
      if (focus && !this.editor._destroyed) this.focusCell(session.cellNode);
      this.event('close', session, { reason });
    }
    cancel(reason, focus) {
      const session = this.session;
      if (!session || session.state !== 'editing') return false;
      const closeReason = reason || 'cancel';
      session.state = 'closing';
      this.event('cancel', session, { reason: closeReason });
      this.close(session, closeReason, focus !== false);
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

  const editorActions = {
    add: 'openAddDialog',
    edit: 'openEditDialog',
    delete: 'openDeleteDialog',
    refresh: 'refresh',
  };

  function bindToolbar(editor) {
    const api = editor.api();
    if (typeof api.button !== 'function') return;
    Object.keys(editorActions).forEach((name) => {
      const button = api.button(name + ':name');
      if (!button || !button.count()) return;
      const original = button.action();
      const action = () => {
        editor[editorActions[name]]();
      };
      editor._buttonActions.push({ name, original, action });
      button.action(action);
    });
  }

  function restoreToolbar(editor) {
    const api = editor.api();
    editor._buttonActions.forEach(({ name, original, action }) => {
      const button = api.button(name + ':name');
      if (button.count() && button.action() === action)
        button.action(original || function () {});
    });
    editor._buttonActions = [];
  }

  function selectionListener() {
    const api = this.api();
    const namespace = this.s.namespace;
    const updateEditButton = () => {
      if (typeof api.buttons !== 'function') return;
      const buttons = api.buttons('edit:name');
      if (!buttons || (typeof buttons.count === 'function' && !buttons.count()))
        return;
      if (this._selectedRows().count() === 1) buttons.enable();
      else buttons.disable();
    };
    const events = 'select' + namespace + ' deselect' + namespace;
    api.off(events);
    api.on(events, updateEditButton);
    updateEditButton();
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
      if (!table) throw new TypeError('AltEditor requires a DataTables table');
      if (table.altEditor && !table.altEditor._destroyed) return table.altEditor;
      if (!DataTable.versionCheck('2.1') || DataTable.versionCheck('3'))
        throw new Error('AltEditor requires DataTables >=2.1.0 <3');
      this.c = normalizeOptions(
        DataTable.defaults.altEditor,
        api.init(),
        options
      );
      const id = instance++;
      this._instanceId = 'altEditor' + id;
      this.s = {
        dt: api,
        namespace: '.' + this._instanceId,
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
        bindToolbar(this);
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
      methods$6,
      methods$3,
      methods$4,
      methods$5,
      methods$2,
      methods$1,
      methods,
      feedbackMethods,
      {
        selectionListener,
        /** @returns {DataTable.Api} The associated table API. */
        api: function () {
          return this.s.dt;
        },
        completeColumnDefs: function () {
          return normalizeColumns(this.api());
        },
        completeFieldDefs: function () {
          const fields = this.c.fields;
          return normalizeFields(
            fields,
            fields == null ? normalizeColumns(this.api()) : undefined
          );
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
        /** Finish or submit the active cell. @returns {boolean} Whether the edit was accepted. */
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
          cancelPersistence(this);
          if (this._inline) this._inline.destroy();
          this._dialogOpen = false;
          this._abortFileReads();
          this._dialogShown = false;
          this._opening = false;
          this._closing = false;
          this._dialogContext = null;
          this._editSnapshot = null;
          this._deleteSnapshot = null;
          restoreToolbar(this);
          if (this._languageRequest) this._languageRequest.abort();
          clearFieldErrors(this);
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
    Object.defineProperties(AltEditor.prototype, {
      random_id: {
        get() {
          return this._instanceId;
        },
        set(value) {
          this._instanceId = value;
        },
        configurable: true,
      },
      columnDefs: {
        get() {
          return this._dialogFieldDefinitions;
        },
        set(value) {
          this._dialogFieldDefinitions = value;
        },
        configurable: true,
      },
    });
    AltEditor.version = '4.3.1';
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
   * DataTables AltEditor
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

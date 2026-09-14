import { document } from '../core/dependencies.js';
import { emit } from '../core/events.js';
import { snapshotRow, resolveRow, invoke, cloneRow } from '../data/row-data.js';
import { withValue } from '../data/path.js';
import { equalFieldValues } from '../data/field-values.js';
import {
  controlOptions,
  createControl,
  controlValue,
} from './inline-control.js';

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

export class InlineEditor {
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

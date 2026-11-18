import { validateFields } from '../data/validation.js';
import { normalizeError } from '../data/errors.js';
import { document } from '../core/dependencies.js';
import { emit } from '../core/events.js';
import { requireSynchronousResult } from '../core/synchronous-result.js';
import { bindControlEvents } from './control-events.js';
import { snapshotRow, resolveRow, cloneRow } from '../data/row-data.js';
import { acceptPersistedRow, invokePersistence } from '../data/persistence.js';
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
      oldValue: cell.data(),
      originalRow: cloneRow(row.data()),
      cellNode: cell.node(),
      options,
      state: 'editing',
      composing: false,
    });
    session.control = createControl(options, session.oldValue);
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
      if (this.start({ row: rowIndex, column: columns[index] })) return;
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

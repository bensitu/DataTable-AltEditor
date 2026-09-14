import $ from 'jquery';
import DataTable from 'datatables.net';
import '../src/index.js';
import { afterEach, expect, test, vi } from 'vitest';

let table;
const originalModal = $.fn.modal;
afterEach(() => {
  table?.destroy();
  table = undefined;
  $.fn.modal = originalModal;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});
function create() {
  document.body.innerHTML =
    '<button id="opener">Open</button><table id="table"></table>';
  table = new DataTable('#table', {
    data: [{ name: 'Alice' }],
    columns: [{ data: 'name', title: 'Name' }],
    altEditor: true,
  });
  return table.altEditor();
}

test.each(['bootstrap5', 'bootstrap4', 'bootstrap3', 'foundation'])(
  '%s dialogs block closing during persistence and release resources',
  async (framework) => {
    const hide = vi.fn();
    const dispose = vi.fn();
    const show = vi.fn(() => {
      if (framework !== 'foundation') $(element).trigger('shown.bs.modal');
    });
    let element;
    vi.stubGlobal('bootstrap', undefined);
    vi.stubGlobal('Foundation', undefined);
    $.fn.modal = undefined;
    if (framework === 'bootstrap5') {
      const instance = { show, hide, dispose };
      vi.stubGlobal('bootstrap', {
        Modal: {
          getOrCreateInstance: vi.fn((node) => {
            element = node;
            return instance;
          }),
          getInstance: () => instance,
        },
      });
    } else if (framework === 'bootstrap4' || framework === 'bootstrap3') {
      $.fn.modal = function (action) {
        element = this[0];
        this.data('bs.modal', framework === 'bootstrap3' ? {} : { dispose });
        ({ show, hide })[action]();
        return this;
      };
    } else {
      vi.stubGlobal('Foundation', {
        Reveal: class {
          constructor(node) {
            element = node[0];
          }
          open() {
            show();
          }
          close() {
            hide();
          }
          destroy() {
            dispose();
          }
        },
      });
    }
    const editor = create();
    const opener = document.querySelector('#opener');
    opener.focus();
    const closed = vi.fn();
    $(table.table().node()).on('alteditor-close.dt', closed);
    editor.openAddDialog();
    expect(show).toHaveBeenCalledOnce();
    expect(element).toBe(document.querySelector(editor.modal_selector));
    let success;
    editor.onAddRow = (_editor, _values, accept) => {
      success = accept;
    };
    await editor._addRowData();
    const event = $.Event('hide.bs.modal');
    $(element).trigger(event);
    expect(event.isDefaultPrevented()).toBe(true);
    expect(editor.openAddDialog()).toBe(false);
    expect(editor.openEditDialog(0)).toBe(false);
    expect(editor.openDeleteDialog(0)).toBe(false);
    success({ name: 'Bob' });
    expect(hide).toHaveBeenCalledOnce();
    $(element).trigger(
      framework === 'foundation' ? 'closed.zf.reveal' : 'hidden.bs.modal'
    );
    expect(closed).toHaveBeenCalledOnce();
    expect(editor._dialogOpen).toBe(false);
    expect(document.activeElement).toBe(opener);
    $(element).trigger('hidden.bs.modal');
    expect(closed).toHaveBeenCalledOnce();
    editor.openEditDialog(0);
    expect(show).toHaveBeenCalledTimes(2);
    editor.destroy();
    expect(dispose).toHaveBeenCalledTimes(framework === 'bootstrap3' ? 0 : 1);
    expect(element.isConnected).toBe(false);
  }
);

test('reports missing dialog frameworks without marking a dialog open', () => {
  vi.stubGlobal('bootstrap', undefined);
  vi.stubGlobal('Foundation', undefined);
  $.fn.modal = undefined;
  const editor = create();
  const failure = vi.fn();
  editor.api().on('alteditor-error.dt', failure);
  for (const open of ['openAddDialog', 'openEditDialog', 'openDeleteDialog']) {
    expect(editor[open](0)).toBe(false);
    expect(document.querySelector('.altEditor-message').textContent).toContain(
      'Bootstrap Modal or Foundation Reveal'
    );
  }
  expect(failure).toHaveBeenCalledTimes(3);
  expect(editor._dialogOpen).toBeFalsy();
});

test('native closure ignores delayed notifications and blocks cancellation during persistence', async () => {
  const initial = create();
  initial.destroy();
  const editor = table.altEditor({ dialog: { framework: 'native' } });
  const element = document.querySelector(editor.modal_selector);
  element.showModal = function () {
    this.open = true;
  };
  element.close = function () {
    this.open = false;
  };
  const closed = vi.fn();
  table.on('alteditor-close.dt', closed);
  editor.openAddDialog();
  const form = element.querySelector('form');
  const submit = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submit);
  await Promise.resolve();
  await Promise.resolve();
  expect(submit.defaultPrevented).toBe(true);
  editor.internalCloseDialog(editor.modal_selector);
  expect(closed).toHaveBeenCalledOnce();
  editor.openEditDialog(0);
  element.dispatchEvent(new Event('close'));
  expect(editor._dialogOpen).toBe(true);
  expect(closed).toHaveBeenCalledOnce();
  let accept;
  editor.onEditRow = (_editor, _values, success) => {
    accept = success;
  };
  await editor._editRowData();
  const cancel = new Event('cancel', { cancelable: true });
  element.dispatchEvent(cancel);
  expect(cancel.defaultPrevented).toBe(true);
  $(element).find('.altEditor-close').trigger('click');
  expect(element.open).toBe(true);
  accept();
  expect(element.open).toBe(false);
  expect(closed).toHaveBeenCalledTimes(2);
  editor.openEditDialog(0);
  $(element).find('[data-alteditor-close]').trigger('click');
  expect(element.open).toBe(false);
  editor.openEditDialog(0);
  editor.destroy();
  expect(element.open).toBe(false);
  expect(element.isConnected).toBe(false);
});

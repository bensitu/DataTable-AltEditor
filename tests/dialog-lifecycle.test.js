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

test.each(['bootstrap5', 'bootstrap4', 'foundation'])(
  '%s dialogs block closing during persistence and release resources',
  async (framework) => {
    const hide = vi.fn();
    const dispose = vi.fn();
    const show = vi.fn();
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
    } else if (framework === 'bootstrap4') {
      $.fn.modal = function (action) {
        element = this[0];
        this.data('bs.modal', {});
        ({ show, hide, dispose })[action]();
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
    expect(dispose).toHaveBeenCalledOnce();
    expect(element.isConnected).toBe(false);
  }
);

test('reports missing dialog frameworks without marking a dialog open', () => {
  vi.stubGlobal('bootstrap', undefined);
  vi.stubGlobal('Foundation', undefined);
  $.fn.modal = undefined;
  const editor = create();
  expect(() => editor.openAddDialog()).toThrow(
    'Bootstrap Modal or Foundation Reveal'
  );
  expect(editor._dialogOpen).toBeFalsy();
});

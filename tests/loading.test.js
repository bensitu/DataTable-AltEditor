import { expect, test, vi } from 'vitest';
import $ from 'jquery';
import japanese from '../translations/ja.json';
import DataTable from 'datatables.net';
import AltEditor from '../src/index.js';

test('registers an editor for automatic initialization', () => {
  document.body.innerHTML = '<table id="table"></table>';
  const table = new DataTable('#table', {
    data: [{ name: 'Alice' }],
    columns: [{ data: 'name', title: 'Name' }],
    altEditor: true,
  });
  expect(table.table().node().altEditor).toBeInstanceOf(AltEditor);
  expect(
    getComputedStyle(document.querySelector('.altEditor-modal')).display
  ).toBe('none');
  expect(table.altEditor()).toBe(table.altEditor({}));
  expect(table.altEditor().api().table().node()).toBe(table.table().node());
  table.destroy();
});

test('creates an editor explicitly without Buttons or Select', () => {
  document.body.innerHTML = '<table id="table"></table>';
  const table = new DataTable('#table', {
    data: [[1]],
    columns: [{ title: 'Value' }],
  });
  expect(table.altEditor()).toBeNull();
  const editor = table.altEditor({});
  expect(new AltEditor(table)).toBe(editor);
  editor.internalOpenDialog = (_selector, fill) => fill();
  editor.openEditDialog(0);
  expect(document.querySelector('.modal input').value).toBe('1');
  table.destroy();
});

test('loads translated dialog labels and close accessibility text asynchronously', () => {
  let complete;
  const request = vi.spyOn($, 'ajax').mockImplementation((options) => {
    complete = options.success;
    return { abort: vi.fn() };
  });
  let table;
  try {
    document.body.innerHTML = '<table id="table"></table>';
    table = new DataTable('#table', {
      data: [{ name: 'Alice' }],
      columns: [{ data: 'name', title: 'Name' }],
      altEditor: true,
      language: { altEditorUrl: '/translations/ja.json' },
    });
    const editor = table.altEditor();
    const modal = document.querySelector(editor.modal_selector);
    expect(
      modal.querySelector('.altEditor-close').getAttribute('aria-label')
    ).toBe('Close');
    complete(japanese);
    expect(
      modal.querySelector('.altEditor-close').getAttribute('aria-label')
    ).toBe(japanese.modalClose);
    editor.internalOpenDialog = (_selector, fill) => fill();
    editor.openEditDialog(0);
    expect(modal.querySelector('.modal-title').textContent).toBe(
      japanese.edit.title
    );
    expect(
      modal.querySelector('.modal-footer [type="submit"]').textContent
    ).toBe(japanese.edit.button);
    expect(
      modal.querySelector('.modal-footer [type="button"]').textContent
    ).toBe(japanese.modalClose);
    expect(modal.querySelector('input').value).toBe('Alice');
  } finally {
    table?.destroy();
    request.mockRestore();
  }
});

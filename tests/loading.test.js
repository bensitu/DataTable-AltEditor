import { expect, test, vi } from 'vitest';
import $ from 'jquery';
import japanese from '../translations/ja.json';
import DataTable from 'datatables.net';
import AltEditor from '../src/index.js';

test('keeps default labels and reports invalid or unavailable remote translations', () => {
  let requestOptions;
  const request = vi.spyOn($, 'ajax').mockImplementation((options) => {
    requestOptions = options;
    return { abort() {} };
  });
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  document.body.innerHTML = '<table id="table"></table>';
  const table = new DataTable('#table', {
    data: [[1]],
    columns: [{ title: 'Value' }],
    altEditor: true,
    language: { altEditorUrl: '/language.json' },
  });
  try {
    const editor = table.altEditor();
    const error = vi.fn();
    $(table.table().node()).on('alteditor-error.dt', error);
    for (const value of [
      { error: null },
      ['invalid'],
      JSON.parse('{"__proto__":{}}'),
    ])
      expect(() => requestOptions.success(value)).not.toThrow();
    requestOptions.error({}, 'timeout', 'Timed out');
    expect(editor.language.error.message).toBe('There was an unknown error!');
    expect(error).toHaveBeenCalledTimes(4);
    expect(warning).toHaveBeenCalledTimes(4);
    editor.destroy();
    requestOptions.error({}, 'abort');
    expect(error).toHaveBeenCalledTimes(4);
  } finally {
    table.destroy();
    warning.mockRestore();
    request.mockRestore();
  }
});

test('keeps the DataTable usable when automatic editor configuration is invalid', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  document.body.innerHTML = '<table id="table"></table>';
  const table = new DataTable('#table', {
    data: [[1]],
    columns: [{ title: 'Value' }],
    altEditor: true,
    language: { altEditor: { error: null } },
  });
  try {
    expect(table.rows().count()).toBe(1);
    expect(table.altEditor()).toBeNull();
    expect(document.querySelector('.altEditor-modal')).toBeNull();
    expect(log).toHaveBeenCalledOnce();
  } finally {
    table.destroy();
    log.mockRestore();
  }
});

test('requires explicit row selectors when Select is absent', async () => {
  document.body.innerHTML = '<table id="table"></table>';
  const table = new DataTable('#table', {
    data: [{ name: 'Alice' }, { name: 'Bob' }],
    columns: [{ data: 'name', title: 'Name' }],
    altEditor: true,
  });
  try {
    const editor = table.altEditor();
    editor.internalOpenDialog = (_selector, fill) => fill();
    expect(editor.openDeleteDialog()).toBe(false);
    expect(editor._deleteSnapshot).toBeFalsy();
    expect(editor.openEditDialog()).toBe(false);
    expect(table.rows().count()).toBe(2);
    editor.openDeleteDialog(0);
    await editor._deleteRow();
    expect(table.rows().data().toArray()).toEqual([{ name: 'Bob' }]);
  } finally {
    table.destroy();
  }
});

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
    editor.internalOpenDialog = (_selector, fill) => fill();
    editor.openEditDialog(0);
    modal.querySelector('input').value = 'Unsaved';
    complete(japanese);
    expect(
      modal.querySelector('.altEditor-close').getAttribute('aria-label')
    ).toBe(japanese.modalClose);
    expect(modal.querySelector('.modal-title').textContent).toBe(
      japanese.edit.title
    );
    expect(
      modal.querySelector('.modal-footer [type="submit"]').textContent
    ).toBe(japanese.edit.button);
    expect(
      modal.querySelector('.modal-footer [type="button"]').textContent
    ).toBe(japanese.modalClose);
    expect(modal.querySelector('input').value).toBe('Unsaved');
  } finally {
    table?.destroy();
    request.mockRestore();
  }
});

test('releases partially initialized editors so initialization can be retried', () => {
  document.body.innerHTML = '<table id="table"></table>';
  const table = new DataTable('#table', {
    data: [[1]],
    columns: [{ title: 'Value' }],
    altEditor: false,
  });
  const request = vi.spyOn($, 'ajax').mockImplementation(() => {
    throw new Error('Transport unavailable');
  });
  table.init().language = { altEditorUrl: '/translation.json' };
  try {
    expect(() => table.altEditor({})).toThrow('Transport unavailable');
    expect(table.altEditor()).toBeNull();
    expect(document.querySelector('.altEditor-modal')).toBeNull();
    table.init().language = {};
    expect(table.altEditor({})).toBeTruthy();
  } finally {
    table.destroy();
    request.mockRestore();
  }
});

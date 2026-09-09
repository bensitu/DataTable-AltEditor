import { expect, test } from 'vitest';
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

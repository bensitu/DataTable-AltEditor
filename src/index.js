import $ from 'jquery';
import DataTables from 'datatables.net';
import { createAltEditor } from './core/alt-editor.js';
import { register } from './core/api.js';
import { configure } from './core/dependencies.js';

function initialize(root, jquery) {
  jquery = jquery || ($.fn ? $ : $(root));
  configure(root, jquery);
  const DataTable =
    jquery.fn.dataTable ||
    (DataTables.Api ? DataTables : DataTables(root, jquery));
  if (DataTable.altEditor) return DataTable.altEditor;
  const AltEditor = createAltEditor(DataTable);
  register(DataTable, AltEditor);
  return AltEditor;
}

export default typeof window === 'undefined'
  ? initialize
  : initialize(window, $);

/**
 * DataTables AltEditor v4.0.0
 * Copyright (c) 2016 Kingkode, KasperOlesen, luca-vercelli, zack-hable
 * Copyright (c) 2026 Ben Situ and contributors
 * SPDX-License-Identifier: MIT
 */
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

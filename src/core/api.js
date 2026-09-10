import { $, root as window, document } from './dependencies.js';

export function register(DataTable, AltEditor) {
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

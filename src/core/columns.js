const keys =
  'editable visible type readonly disabled required hoverMsg pattern unique uniqueMsg maxLength multiple select2 datepicker datetimepicker editorOnChange editorValidate style dateFormat dateInputFormat optionsSortByLabel inline step min max value options rows cols accept maxFileSize special placeholder inlineEditable inlineEditType inlineEditOptions inlineEditSetValue'.split(
    ' '
  );

export function normalizeColumns(api) {
  const columns = [];
  api.columns().every(function (index) {
    const init = this.init() || {};
    const column = {
      index,
      title: this.header() ? this.header().textContent : '',
      name: this.dataSrc(),
      editable: true,
      visible: this.visible(),
      type: 'text',
      rows: 5,
      cols: 30,
      options: [],
    };
    keys.forEach((key) => {
      if (init[key] !== undefined) column[key] = init[key];
    });
    if (column.type === 'readonly') {
      column.type = 'text';
      column.readonly = true;
    }
    if (column.placeholder === undefined) column.placeholder = column.title;
    columns.push(column);
  });
  return columns;
}

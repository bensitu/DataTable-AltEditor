import $ from 'jquery';
import '../src/index.js';
import { afterEach, expect, test, vi } from 'vitest';
import { methods } from '../src/dialog/plugins.js';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

test('initializes optional controls, scopes popups and releases their handlers', () => {
  document.body.innerHTML =
    '<div id="editor"><select id="user.role"><option value="b">Beta</option><option value="a">Alpha</option></select><input id="date"><input id="timestamp"></div>';
  const change = vi.fn();
  const select2 = vi.fn(function (options) {
    if (options !== 'destroy') this.addClass('select2-hidden-accessible');
    return this;
  });
  const datepicker = vi.fn(function () {
    this.addClass('hasDatepicker');
    return this;
  });
  const datetimepicker = vi.fn(function () {
    return this;
  });
  const originals = {
    select2: $.fn.select2,
    datepicker: $.fn.datepicker,
    datetimepicker: $.fn.datetimepicker,
  };
  Object.assign($.fn, { select2, datepicker, datetimepicker });
  try {
    const config = { className: 'calendar' };
    const editor = {
      ...methods,
      modal_selector: '#editor',
      s: { modalNamespace: '.example' },
      columnDefs: [
        {
          name: 'user.role',
          type: 'select',
          select2: { width: '100%' },
          optionsSortByLabel: true,
          editorOnChange: change,
        },
        { name: 'date', datepicker: { dateFormat: 'yy-mm-dd' } },
        { name: 'timestamp', datetimepicker: config },
      ],
    };
    const select = document.querySelector('select');
    select.value = 'b';
    editor._initializePlugins();
    expect(select.value).toBe('b');
    expect([...select.options].map((o) => o.value)).toEqual(['a', 'b']);
    expect(select2.mock.calls[0][0].dropdownParent[0]).toBe(
      document.querySelector('#editor')
    );
    expect(datetimepicker).toHaveBeenCalledWith({
      className: 'calendar altEditor-datetimepicker',
    });
    expect(config.className).toBe('calendar');
    editor._setFieldValue($(select), { type: 'select', select2: true }, 'a');
    expect(change).toHaveBeenCalledOnce();
    expect(change.mock.calls[0][1]).toBe(editor);
    editor._cleanupPlugins();
    expect(select2).toHaveBeenLastCalledWith('destroy');
    expect(datepicker).toHaveBeenLastCalledWith('destroy');
    expect(datetimepicker).toHaveBeenLastCalledWith('destroy');
    $(select).trigger('change');
    expect(change).toHaveBeenCalledOnce();
    expect(
      $('#timestamp').attr('data-alteditor-datetimepicker')
    ).toBeUndefined();
  } finally {
    Object.assign($.fn, originals);
  }
});

test('supports serialized select values and optional date formatting without changing invalid dates', () => {
  const select = $(
    '<select multiple><option value="a">Alpha</option><option value="b">Beta</option><option value="[invalid">Invalid</option></select>'
  );
  methods._setFieldValue(select, { type: 'select' }, '["a","b"]');
  expect(select.val()).toEqual(['a', 'b']);
  methods._setFieldValue(select, { type: 'select' }, '[invalid');
  expect(select.val()).toEqual(['[invalid']);
  const input = $('<input>');
  vi.stubGlobal(
    'moment',
    vi.fn((value) => ({
      isValid: () => value === '2026-09-10',
      format: () => '10/09/2026',
    }))
  );
  methods._setFieldValue(
    input,
    { type: 'date', dateFormat: 'DD/MM/YYYY' },
    '2026-09-10'
  );
  expect(input.val()).toBe('10/09/2026');
  methods._setFieldValue(
    input,
    { type: 'time', dateFormat: 'HH:mm', dateInputFormat: 'HH:mm:ss' },
    '13:05:00'
  );
  expect(window.moment).toHaveBeenLastCalledWith('13:05:00', 'HH:mm:ss', true);
  methods._setFieldValue(
    input,
    { type: 'date', dateFormat: 'DD/MM/YYYY' },
    'invalid'
  );
  expect(input.val()).toBe('invalid');
  methods._setFieldValue(input, {}, undefined);
  expect(input.val()).toBe('');
});

test('continues cleanup when a date/time plugin fails to destroy', () => {
  const original = $.fn.datetimepicker;
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
  $.fn.datetimepicker = vi.fn(() => {
    throw new Error('Unavailable');
  });
  document.body.innerHTML =
    '<div id="editor"><input data-alteditor-datetimepicker="true"><input data-alteditor-datetimepicker="true"></div>';
  try {
    methods._cleanupPlugins.call({
      modal_selector: '#editor',
      s: { modalNamespace: '.example' },
    });
    expect($.fn.datetimepicker).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledTimes(2);
    expect(
      document.querySelector('[data-alteditor-datetimepicker]')
    ).toBeNull();
  } finally {
    $.fn.datetimepicker = original;
  }
});

import { $, root as window, document } from '../core/dependencies.js';
import { fieldElement } from '../data/field-values.js';

export const methods = {
  _initializePlugins: function () {
    if (!this.columnDefs || !Array.isArray(this.columnDefs)) return;
    var that = this;
    var selector = this.modal_selector;

    this.columnDefs.forEach(function (columnDef) {
      if (
        typeof columnDef.name !== 'string' &&
        typeof columnDef.name !== 'number'
      )
        return;
      var $element = fieldElement(selector, columnDef.name);
      if (!$element.length) return;

      if (
        String(columnDef.type || '').indexOf('select') >= 0 &&
        columnDef.optionsSortByLabel
      ) {
        var oldValue = $element.val();
        var options = $element.find('option').get();
        options.sort(function (a, b) {
          return $(a).text().localeCompare($(b).text());
        });
        $element.empty().append(options);
        if (oldValue !== undefined && oldValue !== null) $element.val(oldValue);
      }

      if (columnDef.select2) {
        if (typeof $.fn.select2 === 'function') {
          var config =
            typeof columnDef.select2 === 'object'
              ? $.extend({}, columnDef.select2)
              : {};
          config.dropdownParent = $(that.modal_selector);
          $element.select2(config);
        }
      } else if (
        columnDef.datepicker &&
        typeof $.fn.datepicker === 'function'
      ) {
        $element.datepicker(columnDef.datepicker);
      } else if (
        columnDef.datetimepicker &&
        typeof $.fn.datetimepicker === 'function'
      ) {
        const config = $.extend({}, columnDef.datetimepicker);
        config.className =
          (config.className ? config.className + ' ' : '') +
          'altEditor-datetimepicker';
        $element.datetimepicker(config);
        $element.attr('data-alteditor-datetimepicker', 'true');
      }

      if (typeof columnDef.editorOnChange === 'function') {
        $element.attr('alt-editor-id', String(columnDef.name));
        $element
          .off('change' + that.s.modalNamespace)
          .on('change' + that.s.modalNamespace, function (event) {
            columnDef.editorOnChange(event, that);
          });
      }
    });
  },
  _cleanupPlugins: function () {
    if (!this.modal_selector) return;
    var selector = this.modal_selector;
    if (typeof $.fn.select2 === 'function') {
      $(selector)
        .find('select.select2-hidden-accessible')
        .each(function () {
          try {
            $(this).select2('destroy');
          } catch (_error) {}
        });
    }
    if (typeof $.fn.datepicker === 'function') {
      $(selector)
        .find('.hasDatepicker')
        .each(function () {
          try {
            $(this).datepicker('destroy');
          } catch (_error) {}
        });
    }
    if (typeof $.fn.datetimepicker === 'function')
      $(selector)
        .find('[data-alteditor-datetimepicker]')
        .each(function () {
          const picker = $(this).data('DateTimePicker');
          if (picker && picker.destroy) picker.destroy();
          else $(this).datetimepicker('destroy');
          $(this).removeAttr('data-alteditor-datetimepicker');
        });
    $(selector).find('[alt-editor-id]').off(this.s.modalNamespace);
  },
  _setFieldValue: function ($element, columnDef, value) {
    if (!$element || !$element.length) return;
    var type = String(columnDef.type || 'text');
    var normalized = value === null || value === undefined ? '' : value;

    if (type.indexOf('select') >= 0) {
      var selectValue = normalized;
      if (typeof normalized === 'string') {
        var trimmed = normalized.trim();
        if (trimmed.charAt(0) === '[' || trimmed.charAt(0) === '{') {
          try {
            selectValue = JSON.parse(trimmed);
          } catch (_error) {}
        }
      }
      if (columnDef.select2 && $element.hasClass('select2-hidden-accessible')) {
        $element.val(selectValue).trigger('change');
      } else {
        $element.val(selectValue);
      }
      return;
    }

    if (type.indexOf('checkbox') >= 0) {
      var checked =
        normalized === true ||
        normalized === 1 ||
        ['true', '1', 'yes', 'on'].indexOf(String(normalized).toLowerCase()) >=
          0;
      $element.prop('checked', checked);
      return;
    }

    if (
      type.indexOf('date') >= 0 &&
      columnDef.dateFormat &&
      typeof window.moment === 'function'
    ) {
      var date = window.moment(String(normalized));
      if (date && date.isValid()) {
        $element.val(date.format(columnDef.dateFormat));
        return;
      }
    }

    $element.val(normalized);
  },
  /** Replace select options while retaining the current value when available.
   * @param {Element|jQuery} $select Select control.
   * @param {Array|Object} options Available values and labels.
   */
  reloadOptions: function ($select, options) {
    $select = $($select);
    if (!$select || !$select.length) return;
    var oldValue = $select.val();
    var normalized = this._normalizeOptions(options || []);
    $select.empty();
    normalized.forEach(function (option) {
      $('<option/>').val(option.value).text(option.label).appendTo($select);
    });
    if (oldValue !== undefined && oldValue !== null) $select.val(oldValue);
    $select.trigger('change');
  },
};

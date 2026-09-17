import { $, root as window } from '../core/dependencies.js';
import {
  fieldElement,
  isChecked,
  setSelectValue,
} from '../data/field-values.js';

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
          $element.each(function () {
            const container = $(this).next('.select2-container');
            const selection = container.find('.select2-selection');
            const label = this.labels && this.labels[0];
            const name =
              this.getAttribute('aria-label') ||
              String(columnDef.title || columnDef.name);
            if (label && label.id) {
              const described = selection.attr('aria-labelledby');
              selection.attr(
                'aria-labelledby',
                label.id + (described ? ' ' + described : '')
              );
            } else
              selection.attr('aria-label', name).removeAttr('aria-labelledby');
            container.find('.select2-search__field').attr('aria-label', name);
            $(this).on('select2:open' + that.s.modalNamespace, function () {
              $(selector)
                .find('.select2-dropdown .select2-search__field')
                .attr('aria-label', name);
            });
          });
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
          } catch (error) {
            console.warn('AltEditor could not destroy Select2', error);
          }
        });
    }
    if (typeof $.fn.datepicker === 'function') {
      $(selector)
        .find('.hasDatepicker')
        .each(function () {
          try {
            $(this).datepicker('destroy');
          } catch (error) {
            console.warn('AltEditor could not destroy the date picker', error);
          }
        });
    }
    if (typeof $.fn.datetimepicker === 'function')
      $(selector)
        .find('[data-alteditor-datetimepicker]')
        .each(function () {
          try {
            const picker = $(this).data('DateTimePicker');
            if (picker && picker.destroy) picker.destroy();
            else $(this).datetimepicker('destroy');
          } catch (error) {
            console.warn(
              'AltEditor could not destroy the date/time picker',
              error
            );
          }
          $(this).removeAttr('data-alteditor-datetimepicker');
        });
    $(selector).find('input, select, textarea').off(this.s.modalNamespace);
  },
  _setFieldValue: function ($element, columnDef, value) {
    if (!$element || !$element.length) return;
    var type = String(columnDef.type || 'text');
    var normalized = value === null || value === undefined ? '' : value;

    if (type.indexOf('select') >= 0) {
      $element.each(function () {
        setSelectValue(this, normalized);
      });
      if (columnDef.select2 && $element.hasClass('select2-hidden-accessible')) {
        $element.trigger('change');
      }
      return;
    }

    if (type.indexOf('checkbox') >= 0) {
      $element.prop('checked', isChecked(normalized));
      return;
    }

    if (
      ['date', 'datetime-local', 'time'].indexOf(type) >= 0 &&
      columnDef.dateFormat &&
      typeof window.moment === 'function'
    ) {
      var date = window.moment(
        String(normalized),
        columnDef.dateInputFormat || window.moment.ISO_8601,
        true
      );
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

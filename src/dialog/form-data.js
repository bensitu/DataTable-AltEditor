import { $, root as window } from '../core/dependencies.js';

export const methods = {
  _collectFormData: function ($form) {
    var that = this;
    var columns = this.columnDefs || this.completeColumnDefs();
    var values = columns.every(function (column) {
      return typeof column.name === 'number';
    })
      ? []
      : {};
    var fileTasks = [];

    $form.find('select, textarea, input').each(function () {
      if (this.disabled) return;
      var $input = $(this);
      var id = this.name || this.id;
      if (!id) return;
      var type = String($input.attr('type') || '').toLowerCase();

      if (type === 'file') {
        var files = $input.prop('files');
        var file = files && files[0];
        if (!file) return;
        const column = columns.find((item) => String(item.name) === id);
        if (
          column &&
          column.maxFileSize !== undefined &&
          (!Number.isFinite(column.maxFileSize) ||
            column.maxFileSize < 0 ||
            file.size > column.maxFileSize)
        )
          throw new Error(that.language.error.fileSize);
        if (that.encodeFiles) {
          fileTasks.push(function () {
            return new Promise(function (resolve, reject) {
              that.getBase64(
                file,
                function (content) {
                  try {
                    that._setValueByPath(values, id, content);
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                },
                reject
              );
            });
          });
        } else {
          that._setValueByPath(values, id, file);
        }
        return;
      }

      if (type === 'checkbox') {
        that._setValueByPath(values, id, this.checked);
        return;
      }
      if (type === 'radio') {
        if (this.checked) that._setValueByPath(values, id, $input.val());
        return;
      }
      that._setValueByPath(values, id, $input.val());
    });

    return Promise.all(
      fileTasks.map(function (readFile) {
        return readFile();
      })
    ).then(function () {
      return values;
    });
  },
  _validateFormData: function ($form) {
    var errors = [];
    $form.find('select, textarea, input').each(function () {
      if (this.disabled) return;
      var $input = $(this);
      var id = this.name || this.id || 'field';
      if ($input.attr('data-unique') === 'true') {
        $input.trigger($input.is('select') ? 'change' : 'input');
      }
      if (typeof this.checkValidity === 'function' && !this.checkValidity()) {
        errors.push(this.validationMessage || id + ' is invalid');
      }
    });
    return Array.from(new Set(errors));
  },
  getBase64: function (file, onSuccess, onError) {
    var language = this.language.error;
    var reader = new window.FileReader();
    reader.onload = function () {
      if (onSuccess) onSuccess(reader.result);
    };
    reader.onerror = function () {
      var error = reader.error || new Error(language.fileRead);
      if (onError) onError(error);
    };
    reader.onabort = function () {
      if (onError) onError(new Error(language.fileAborted));
    };
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      if (onError) onError(error);
    }
  },
};

import { $, root as window } from '../core/dependencies.js';
import { fieldControls } from './field-elements.js';

export const methods = {
  _collectFormData: function ($form, controls = fieldControls($form)) {
    var that = this;
    var fieldDefinitions =
      this._dialogFieldDefinitions || this.completeFieldDefs();
    var values = fieldDefinitions.every(function (field) {
      return typeof field.name === 'number';
    })
      ? []
      : {};
    var fileTasks = [];

    controls.each(function () {
      if (this.disabled) return;
      var $input = $(this);
      var id = this.name || this.id;
      if (!id) return;
      var type = String($input.attr('type') || '').toLowerCase();

      if (type === 'file') {
        var files = $input.prop('files');
        var file = files && files[0];
        if (!file) return;
        const field = fieldDefinitions.find((item) => String(item.name) === id);
        if (
          field &&
          field.maxFileSize !== undefined &&
          (!Number.isFinite(field.maxFileSize) ||
            field.maxFileSize < 0 ||
            file.size > field.maxFileSize)
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
  _validateFormData: function ($form, fieldErrors) {
    var that = this;
    var errors = [];
    fieldControls($form).each(function () {
      if (this.disabled) return;
      var $input = $(this);
      var id = this.name || this.id || 'field';
      if ($input.attr('data-unique') === 'true') {
        that._validateUniqueField(this);
      }
      if (typeof this.checkValidity === 'function' && !this.checkValidity()) {
        const message =
          this.validationMessage || that.language.error.validation;
        errors.push(message);
        if (fieldErrors) fieldErrors[id] = message;
      }
    });
    return Array.from(new Set(errors));
  },
  getBase64: function (file, onSuccess, onError) {
    var language = this.language.error;
    var reader = new window.FileReader();
    if (!this._fileReaders) this._fileReaders = new Set();
    const readers = this._fileReaders;
    readers.add(reader);
    const finish = (callback, result) => {
      readers.delete(reader);
      reader.onload = reader.onerror = reader.onabort = null;
      if (callback) callback(result);
    };
    reader.onload = function () {
      finish(onSuccess, reader.result);
    };
    reader.onerror = function () {
      var error = reader.error || new Error(language.fileRead);
      finish(onError, error);
    };
    reader.onabort = function () {
      finish(onError, new Error(language.fileAborted));
    };
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      finish(onError, error);
    }
  },
  _abortFileReads: function () {
    if (!this._fileReaders) return;
    Array.from(this._fileReaders).forEach((reader) => {
      try {
        reader.abort();
      } catch (error) {
        console.warn('AltEditor could not stop file reading', error);
      }
    });
    this._fileReaders.clear();
  },
};

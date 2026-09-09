import $ from 'jquery';

export const methods = {
  _editRowData: function () {
    var that = this;
    var snapshot = this._editSnapshot;
    if (!snapshot || this._submitting) return;

    var $form = $('form[name="altEditor-edit-form-' + this.random_id + '"]');
    if (!$form.length) {
      this._errorCallback(new Error('Edit form not found'));
      return;
    }

    var errors = this._validateFormData($form);
    if (errors.length) {
      this._errorCallback(new Error(errors.join('\n')));
      return;
    }

    this._setDialogSubmitting(true);
    this._collectFormData($form)
      .then(function (rowData) {
        try {
          that.onEditRow(
            that,
            rowData,
            function (data) {
              that._editRowCallback(data);
            },
            function (error) {
              that._errorCallback(error);
            },
            snapshot.originalData,
          );
        } catch (error) {
          that._errorCallback(error);
        }
      })
      .catch(function (error) {
        that._errorCallback(error);
      });
  },
  _deleteRow: function () {
    if (this._submitting) return;
    var that = this;
    var snapshot = this._deleteSnapshot;
    if (!snapshot || !snapshot.rows || snapshot.rows.length === 0) {
      this._errorCallback(new Error('No deletion target is available'));
      return;
    }

    this._setDialogSubmitting(true);
    try {
      this.onDeleteRow(
        this,
        snapshot.rows.slice(),
        function (data) {
          that._deleteRowCallback(data);
        },
        function (error) {
          that._errorCallback(error);
        },
      );
    } catch (error) {
      this._errorCallback(error);
    }
  },
  _addRowData: function () {
    if (this._submitting) return;
    var that = this;
    var $form = $('form[name="altEditor-add-form-' + this.random_id + '"]');
    if (!$form.length) {
      this._errorCallback(new Error('Add form not found'));
      return;
    }

    var errors = this._validateFormData($form);
    if (errors.length) {
      this._errorCallback(new Error(errors.join('\n')));
      return;
    }

    this._setDialogSubmitting(true);
    this._collectFormData($form)
      .then(function (rowData) {
        try {
          that.onAddRow(
            that,
            rowData,
            function (data) {
              that._addRowCallback(data);
            },
            function (error) {
              that._errorCallback(error);
            },
          );
        } catch (error) {
          that._errorCallback(error);
        }
      })
      .catch(function (error) {
        that._errorCallback(error);
      });
  },
  _deleteRowCallback: function (response, status, more) {
    var snapshot = this._deleteSnapshot;
    if (!snapshot || !snapshot.rowIndexes || snapshot.rowIndexes.length === 0) {
      this._errorCallback(new Error('Deletion target is no longer available'));
      return;
    }

    try {
      this.s.dt.rows(snapshot.rowIndexes).remove();
      this.s.dt.draw('full-hold');
      this._deleteSnapshot = null;
      this._completeSuccessfulSubmit();
      if (this.debug) console.log('_deleteRowCallback completed.', response);
    } catch (error) {
      this._errorCallback(error);
    }
  },
  _addRowCallback: function (response, status, more) {
    var data = this._normalizeResponseData(response);
    try {
      this.s.dt.row.add(data).draw(false);
      this._completeSuccessfulSubmit();
      if (this.debug) console.log('_addRowCallback completed.', data);
    } catch (error) {
      this._errorCallback(error);
    }
  },
  _editRowCallback: function (response, status, more) {
    var data = this._normalizeResponseData(response);
    var snapshot = this._editSnapshot;
    if (!snapshot) {
      this._errorCallback(new Error('Edit target is no longer available'));
      return;
    }

    try {
      var row = this._resolveSnapshotRow(snapshot);
      if (!row) throw new Error('Edit target row no longer exists');
      row.data(data);
      var currentPage = this.s.dt.page();
      this.s.dt.draw('page');
      this.s.dt.page(currentPage).draw('page');
      this._editSnapshot = null;
      this._completeSuccessfulSubmit();
      if (this.debug) console.log('_editRowCallback completed.', data);
    } catch (error) {
      this._errorCallback(error);
    }
  },
  _errorCallback: function (response, status, more) {
    var error = response || {};
    var message = this.language.error.message;

    if (error instanceof Error && error.message) {
      message = error.message;
    } else if (error.responseJSON && error.responseJSON.errors) {
      var messages = [];
      Object.keys(error.responseJSON.errors).forEach(function (key) {
        var value = error.responseJSON.errors[key];
        if (Array.isArray(value)) {
          value.forEach(function (item) {
            if (item !== null && item !== undefined)
              messages.push(String(item));
          });
        } else if (value !== null && value !== undefined) {
          messages.push(String(value));
        }
      });
      if (messages.length) message = messages.join('\n');
    } else if (error.responseText) {
      message = String(error.responseText);
    } else if (error.status !== null && error.status !== undefined) {
      message = this.language.error.responseCode + error.status;
    }

    this._showErrorMessage(message);
    this._setDialogSubmitting(false);
  },
  onAddRow: function (dt, rowdata, success, error) {
    try {
      success(rowdata);
    } catch (exception) {
      if (error) error(exception);
    }
  },
  onEditRow: function (dt, rowdata, success, error, originalRowData) {
    try {
      var merged = $.extend(
        true,
        Array.isArray(originalRowData) ? [] : {},
        originalRowData || {},
        rowdata || {},
      );
      success(merged);
    } catch (exception) {
      if (error) error(exception);
    }
  },
  onDeleteRow: function (dt, rowdata, success, error) {
    try {
      success(rowdata);
    } catch (exception) {
      if (error) error(exception);
    }
  },
  _normalizeResponseData: function (response) {
    if (typeof response !== 'string') return response;
    var trimmed = response.trim();
    if (!trimmed) return response;
    if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
      try {
        return JSON.parse(trimmed);
      } catch (_error) {
        return response;
      }
    }
    return response;
  },
};

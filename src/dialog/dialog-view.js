import { $ } from '../core/dependencies.js';

export function renderDialog(modal, options) {
  const useNative = modal.is('dialog');
  modal.find('.altEditor-title').text(options.title);
  modal.find('.altEditor-body').empty().append(options.body);
  modal
    .find('.altEditor-footer')
    .empty()
    .append(
      $('<button/>', {
        type: 'button',
        class: useNative
          ? 'altEditor-button'
          : 'btn btn-default btn-secondary button secondary',
        'data-alteditor-close': '',
        'data-dismiss': 'modal',
        'data-bs-dismiss': 'modal',
        'data-close': '',
        text: options.closeCaption,
      }),
      $('<button/>', {
        type: 'submit',
        class: useNative
          ? 'altEditor-button altEditor-submit'
          : options.destructive
            ? 'btn btn-danger button'
            : 'btn btn-primary button',
        id: options.buttonId,
        form: options.formName,
        text: options.buttonCaption,
      })
    );
  if (useNative) {
    modal
      .find('[data-dismiss], [data-bs-dismiss], [data-close]')
      .removeAttr('data-dismiss data-bs-dismiss data-close');
    modal
      .find('.form-control')
      .addClass('altEditor-control')
      .removeClass('form-control form-control-sm');
    modal
      .find('.col-form-label')
      .removeClass('col-form-label col-form-label-sm');
  }
  const content = modal.find('.altEditor-content');
  if (!content.parent().is('form'))
    content.wrap($('<form/>', { role: 'form' }));
  content
    .parent()
    .attr({ name: options.formName, id: options.formName })
    .toggleClass('needs-validation', !useNative);
}

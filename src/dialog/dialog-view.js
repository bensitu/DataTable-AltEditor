import { $ } from '../core/dependencies.js';

export function renderDialog(modal, options) {
  modal.find('.modal-title').text(options.title);
  modal.find('.modal-body').empty().append(options.body);
  modal
    .find('.modal-footer')
    .empty()
    .append(
      $('<button/>', {
        type: 'button',
        class: 'btn btn-default btn-secondary button secondary',
        'data-dismiss': 'modal',
        'data-bs-dismiss': 'modal',
        'data-close': '',
        text: options.closeCaption,
      }),
      $('<button/>', {
        type: 'submit',
        class: options.destructive
          ? 'btn btn-danger button'
          : 'btn btn-primary button',
        id: options.buttonId,
        form: options.formName,
        text: options.buttonCaption,
      })
    );
  const content = modal.find('.modal-content');
  if (!content.parent().is('form'))
    content.wrap($('<form/>', { role: 'form' }));
  content
    .parent()
    .attr({ name: options.formName, id: options.formName })
    .addClass('needs-validation');
}

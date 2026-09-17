import { $, document } from '../core/dependencies.js';

function useNeutralControls(modal) {
  modal
    .find('.altEditor-input .form-control')
    .addClass('altEditor-control')
    .removeClass('form-control form-control-sm');
  modal
    .find('.altEditor-label .col-form-label')
    .removeClass('col-form-label col-form-label-sm');
}

export function configureDialogFramework(modal, framework, explicitFoundation) {
  if (framework === 'native') return;
  modal.toggleClass('reveal', framework === 'foundation');
  const buttons = modal.find('.altEditor-footer button');
  if (framework === 'foundation') {
    buttons.removeClass('btn btn-default btn-secondary btn-primary btn-danger');
    if (explicitFoundation) {
      modal.removeClass('modal fade');
      modal.find('.modal-dialog').removeClass('modal-dialog modal-lg');
      ['content', 'header', 'title', 'body', 'footer'].forEach((part) =>
        modal.find('.altEditor-' + part).removeClass('modal-' + part)
      );
      useNeutralControls(modal);
    }
    modal
      .find('[data-dismiss], [data-bs-dismiss]')
      .removeAttr('data-dismiss data-bs-dismiss');
  } else {
    buttons.removeClass('button secondary');
    modal.removeAttr('data-reveal');
    modal.find('[data-close]').removeAttr('data-close');
  }
}

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
    useNeutralControls(modal);
  }
  const content = modal.find('.altEditor-content');
  if (!content.parent().is('form'))
    content.wrap($('<form/>', { role: 'form' }));
  content
    .parent()
    .attr({ name: options.formName, id: options.formName, novalidate: '' })
    .toggleClass('needs-validation', !useNative);
}

export function createDialogShell(modalId, useNative, closeCaption) {
  const titleId = modalId + '-title';
  const bodyId = modalId + '-body';
  var modal = document.createElement(useNative ? 'dialog' : 'div');
  modal.className = useNative
    ? 'altEditor-modal altEditor-native'
    : 'modal fade altEditor-modal reveal';
  if (!useNative) modal.style.display = 'none';
  modal.id = modalId;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', titleId);
  modal.setAttribute('aria-describedby', bodyId);
  modal.setAttribute('data-backdrop', 'static');
  modal.setAttribute('data-keyboard', 'false');
  modal.setAttribute('data-bs-backdrop', 'static');
  modal.setAttribute('data-bs-keyboard', 'false');
  modal.setAttribute('data-reveal', '');
  modal.tabIndex = -1;

  var dialog = document.createElement('div');
  dialog.className = useNative ? 'altEditor-dialog' : 'modal-dialog modal-lg';
  var content = document.createElement('div');
  content.className = 'altEditor-content' + (useNative ? '' : ' modal-content');
  var header = document.createElement('div');
  header.className = 'altEditor-header' + (useNative ? '' : ' modal-header');
  var title = document.createElement('h4');
  title.className = 'altEditor-title' + (useNative ? '' : ' modal-title');
  title.id = titleId;
  var closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'altEditor-close';
  closeButton.setAttribute('data-dismiss', 'modal');
  closeButton.setAttribute('data-bs-dismiss', 'modal');
  closeButton.setAttribute('data-close', '');
  closeButton.setAttribute('aria-label', closeCaption);
  var closeGlyph = document.createElement('span');
  closeGlyph.setAttribute('aria-hidden', 'true');
  closeGlyph.textContent = '×';
  closeButton.appendChild(closeGlyph);
  header.appendChild(title);
  header.appendChild(closeButton);

  var body = document.createElement('div');
  body.className = 'altEditor-body' + (useNative ? '' : ' modal-body');
  body.id = bodyId;
  var footer = document.createElement('div');
  footer.className = 'altEditor-footer' + (useNative ? '' : ' modal-footer');

  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);
  dialog.appendChild(content);
  modal.appendChild(dialog);
  if (useNative) {
    [modal, closeButton].forEach((node) => {
      [...node.attributes]
        .filter((attr) => attr.name.startsWith('data-'))
        .forEach((attr) => node.removeAttribute(attr.name));
    });
  }
  return modal;
}

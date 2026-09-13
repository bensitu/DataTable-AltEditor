import { $, root as window } from '../../core/dependencies.js';
export function available() {
  return (
    !!(
      window.bootstrap &&
      window.bootstrap.Modal &&
      window.bootstrap.Modal.getOrCreateInstance
    ) || typeof $.fn.modal === 'function'
  );
}
export function show(element) {
  if (!$(element).hasClass('show') && !$(element).hasClass('in')) {
    element._altEditorShowing = true;
    $(element)
      .off('shown.bs.modal.altEditorAdapter')
      .one('shown.bs.modal.altEditorAdapter', () => {
        element._altEditorShowing = false;
        if (element._altEditorClosePending) {
          element._altEditorClosePending = false;
          hide(element);
        }
      });
  }
  if (
    window.bootstrap &&
    window.bootstrap.Modal &&
    window.bootstrap.Modal.getOrCreateInstance
  )
    window.bootstrap.Modal.getOrCreateInstance(element).show();
  else $(element).modal('show');
}
export function hide(element) {
  if (element._altEditorShowing) {
    element._altEditorClosePending = true;
    return;
  }
  if (
    window.bootstrap &&
    window.bootstrap.Modal &&
    window.bootstrap.Modal.getOrCreateInstance
  )
    window.bootstrap.Modal.getOrCreateInstance(element).hide();
  else $(element).modal('hide');
}
export function dispose(element) {
  $(element).off('.altEditorAdapter');
  element._altEditorShowing = false;
  element._altEditorClosePending = false;
  element.classList.remove('fade');
  hide(element);
  if (
    window.bootstrap &&
    window.bootstrap.Modal &&
    window.bootstrap.Modal.getOrCreateInstance
  ) {
    const modal = window.bootstrap.Modal.getInstance(element);
    if (modal) modal.dispose();
  } else {
    const modal = $(element).data('bs.modal');
    if (modal && typeof modal.dispose === 'function') modal.dispose();
    else $(element).off('.bs.modal').removeData('bs.modal');
  }
}

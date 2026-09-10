import { $, root as window, document } from '../../core/dependencies.js';
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
  if (
    window.bootstrap &&
    window.bootstrap.Modal &&
    window.bootstrap.Modal.getOrCreateInstance
  )
    window.bootstrap.Modal.getOrCreateInstance(element).show();
  else $(element).modal('show');
}
export function hide(element) {
  if (
    window.bootstrap &&
    window.bootstrap.Modal &&
    window.bootstrap.Modal.getOrCreateInstance
  )
    window.bootstrap.Modal.getOrCreateInstance(element).hide();
  else $(element).modal('hide');
}
export function dispose(element) {
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

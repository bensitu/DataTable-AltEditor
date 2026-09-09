import $ from 'jquery';
export function available() {
  return (
    !!(window.bootstrap && window.bootstrap.Modal) ||
    typeof $.fn.modal === 'function'
  );
}
export function show(element) {
  if (window.bootstrap && window.bootstrap.Modal)
    window.bootstrap.Modal.getOrCreateInstance(element).show();
  else $(element).modal('show');
}
export function hide(element) {
  if (window.bootstrap && window.bootstrap.Modal)
    window.bootstrap.Modal.getOrCreateInstance(element).hide();
  else $(element).modal('hide');
}
export function dispose(element) {
  if (window.bootstrap && window.bootstrap.Modal) {
    const modal = window.bootstrap.Modal.getInstance(element);
    if (modal) modal.dispose();
  } else if ($.fn.modal && $(element).data('bs.modal'))
    $(element).modal('dispose');
}

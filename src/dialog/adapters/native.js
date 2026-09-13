export function available(element) {
  return typeof element.showModal === 'function';
}
export function show(element) {
  element.showModal();
}
export function hide(element) {
  element.close();
  $(element).trigger('alteditor-native-closed');
}
export function dispose(element) {
  if (element.open) element.close();
}
import { $ } from '../../core/dependencies.js';

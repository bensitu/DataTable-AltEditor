import $ from 'jquery';
export function available() {
  return !!(window.Foundation && window.Foundation.Reveal);
}
export function show(element) {
  if (!element._altEditorReveal)
    element._altEditorReveal = new window.Foundation.Reveal($(element));
  element._altEditorReveal.open();
}
export function hide(element) {
  if (element._altEditorReveal) element._altEditorReveal.close();
}
export function dispose(element) {
  if (element._altEditorReveal) {
    element._altEditorReveal.destroy();
    delete element._altEditorReveal;
  }
}

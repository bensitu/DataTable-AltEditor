export let $;
export let root;
export let document;

export function configure(window, jquery) {
  root = window;
  document = window.document;
  $ = jquery;
}

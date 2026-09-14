import { $ } from './dependencies.js';

/** @typedef {Object} EditorEventPayload
 * @property {Object} editor AltEditor instance.
 * @property {string} [action] CRUD action.
 * @property {string} [mode] Editing interface.
 * @property {*} [values] Candidate values.
 * @property {*} [error] Persistence or validation error.
 */

/** Emit a cancelable DataTables event and return whether it was accepted. */
export function emit(editor, name, payload) {
  const event = $.Event('alteditor-' + name + '.dt');
  event.dt = editor.api();
  try {
    $(editor.api().table().node()).trigger(event, [
      Object.assign({ editor }, payload),
    ]);
  } catch (error) {
    if (name === 'before-open' || name.endsWith('pre-submit'))
      event.preventDefault();
    console.error('AltEditor event handler failed:', name, error);
  }
  return !event.isDefaultPrevented();
}

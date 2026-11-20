export function bindControlEvents(
  session,
  settings,
  { commit, cancel, isCurrent }
) {
  const { control, errorNode } = session;
  const clearError = () => {
    control.setCustomValidity('');
    control.removeAttribute('aria-invalid');
    errorNode.textContent = '';
  };
  const listeners = {
    compositionstart() {
      session.composing = true;
    },
    compositionend() {
      session.composing = false;
    },
    keydown(event) {
      if (session.composing || event.isComposing || event.keyCode === 229)
        return;
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel('escape');
      } else if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      } else if (event.key === 'Tab' && settings.tabNavigation) {
        event.preventDefault();
        commit(event.shiftKey ? -1 : 1);
      }
    },
    blur(event) {
      if (!isCurrent() || session.state !== 'editing' || session.detaching)
        return;
      if (!event.relatedTarget && !control.ownerDocument.hasFocus()) return;
      if (settings.submitOnBlur) commit();
      else cancel('blur', false);
    },
    input: clearError,
    change: clearError,
  };
  const entries = Object.entries(listeners);
  entries.forEach(([name, listener]) =>
    control.addEventListener(name, listener)
  );
  return () => {
    entries.forEach(([name, listener]) =>
      control.removeEventListener(name, listener)
    );
  };
}

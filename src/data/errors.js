/** Normalize persistence and validation failures without interpreting messages as HTML. */
export function normalizeError(error, language) {
  const fields = [];
  let message = typeof error === 'string' ? error : '';
  if (error && typeof error === 'object') {
    if (typeof error.message === 'string') message = error.message;
    if (error.fieldErrors && typeof error.fieldErrors === 'object') {
      Object.keys(error.fieldErrors).forEach((name) => {
        const value = error.fieldErrors[name];
        if (typeof value === 'string' && value) fields.push([name, value]);
      });
    }
    if (!message && error.responseJSON && error.responseJSON.errors) {
      const messages = [];
      Object.values(error.responseJSON.errors).forEach((value) => {
        (Array.isArray(value) ? value : [value]).forEach((item) => {
          if (item != null) messages.push(String(item));
        });
      });
      message = messages.join('\n');
    }
    if (!message && error.responseText) message = String(error.responseText);
    if (!message && error.status != null)
      message = language.responseCode + error.status;
  }
  return {
    message: message || (fields.length ? '' : language.message),
    fields,
  };
}

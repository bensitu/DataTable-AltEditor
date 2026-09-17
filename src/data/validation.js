import { cloneRow } from './row-data.js';
import { normalizeError } from './errors.js';

/** Run each validator once against independent copies of the submission snapshot. */
export function validateFields(
  fields,
  editor,
  values,
  originalRowData,
  operation,
  active
) {
  const results = [];
  let asynchronous = false;
  const failure = (error) => {
    const normalized = normalizeError(error, editor.language.error);
    return {
      message: [
        normalized.message,
        ...normalized.fields.map(([, message]) => message),
      ]
        .filter(Boolean)
        .join('\n'),
    };
  };
  fields.forEach((field) => {
    if (!active() || typeof field.validate !== 'function') return;
    const interpret = (result) => {
      if (result === true || result == null) return null;
      if (result === false || typeof result === 'string')
        return {
          field: String(field.name),
          message: result || editor.language.error.validation,
        };
      return failure(
        new TypeError(
          'editorValidate must return true, false, a message, null, or undefined'
        )
      );
    };
    try {
      const result = field.validate(cloneRow(field.value), {
        editor,
        field: field.name,
        values: cloneRow(values),
        originalRowData: cloneRow(originalRowData),
        operation,
      });
      const then = result != null ? result.then : null;
      if (typeof then === 'function') {
        asynchronous = true;
        results.push(
          new Promise((resolve, reject) =>
            then.call(result, resolve, reject)
          ).then(interpret, failure)
        );
      } else results.push(interpret(result));
    } catch (error) {
      results.push(failure(error));
    }
  });
  const combine = (outcomes) => {
    const fieldErrors = Object.create(null);
    const messages = [];
    outcomes.forEach((result) => {
      if (!result) return;
      if (result.field !== undefined)
        fieldErrors[result.field] = result.message;
      else messages.push(result.message);
    });
    return messages.length || Object.keys(fieldErrors).length
      ? { message: messages.join('\n'), fieldErrors }
      : null;
  };
  return asynchronous ? Promise.all(results).then(combine) : combine(results);
}

export function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== '[object Object]')
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function snapshotRow(row) {
  return {
    rowId: row.id(),
    rowIndex: row.index(),
    rowNode: row.node(),
    originalData: row.data(),
  };
}

export function resolveRow(api, snapshot) {
  if (!snapshot) return null;
  if (snapshot.rowId !== undefined && snapshot.rowId !== '') {
    try {
      const byId = api.row('#' + snapshot.rowId);
      if (byId.any()) return byId;
    } catch (_error) {
      // A missing identifier can reach DataTables' CSS selector fallback.
    }
  }
  if (
    snapshot.rowNode &&
    snapshot.rowNode.isConnected &&
    snapshot.rowNode.closest('table') === api.table().node()
  ) {
    const byNode = api.row(snapshot.rowNode);
    if (byNode.any() && byNode.data() === snapshot.originalData) return byNode;
  }
  const byIndex = api.row(snapshot.rowIndex);
  return byIndex.any() && byIndex.data() === snapshot.originalData
    ? byIndex
    : null;
}

export function cloneRow(value, seen) {
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime());
  const prototype = Object.getPrototypeOf(value);
  if (
    !Array.isArray(value) &&
    prototype !== Object.prototype &&
    prototype !== null
  )
    return value;
  seen = seen || new Map();
  if (seen.has(value)) return seen.get(value);
  const result = Array.isArray(value) ? [] : {};
  seen.set(value, result);
  Object.keys(value).forEach((key) => {
    Object.defineProperty(result, key, {
      value: cloneRow(value[key], seen),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  });
  return result;
}

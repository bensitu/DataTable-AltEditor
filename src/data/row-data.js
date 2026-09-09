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
    const byId = api.row('#' + snapshot.rowId);
    if (byId.any()) return byId;
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

/** Invoke a persistence callback; only its first settlement is accepted. */
export function invoke(callback, editor, values, extra, success, error) {
  let settled = false;
  const accept = (handler) => (value) => {
    if (settled) return;
    settled = true;
    handler(value);
  };
  const resolve = accept(success);
  const reject = accept(error);
  try {
    if (callback)
      callback.apply(
        editor,
        [editor, values, resolve, reject].concat(extra || []),
      );
    else resolve(values);
  } catch (failure) {
    reject(failure);
  }
}

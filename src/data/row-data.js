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

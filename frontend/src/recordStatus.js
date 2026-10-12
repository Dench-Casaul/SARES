export function isRecordInTrash(record) {
  return record?.deleted_at !== undefined && record.deleted_at !== null;
}

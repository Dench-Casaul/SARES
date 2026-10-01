import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

function safeFileName(name) {
  return String(name || 'evidence').replace(/[^\w.\-]+/g, '_');
}

export async function uploadEvidenceFiles(files, batchId) {
  const list = Array.from(files || []).filter(Boolean);
  if (list.length === 0) return [];

  const uploaded = [];
  for (const file of list) {
    const path = `evidence/${batchId}/${Date.now()}-${safeFileName(file.name)}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    uploaded.push({
      name: file.name,
      url,
      path,
      contentType: file.type || 'application/octet-stream',
    });
  }
  return uploaded;
}

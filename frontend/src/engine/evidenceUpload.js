import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

function safeFileName(name) {
  return String(name || 'evidence').replace(/[^\w.-]+/g, '_');
}

export async function uploadEvidenceFiles(files, batchId, schoolScope) {
  const list = Array.from(files || []).filter(Boolean);
  if (list.length === 0) return [];
  if (!['elementary', 'high_school', 'shared'].includes(schoolScope)) {
    throw new Error('A valid school scope is required for evidence uploads.');
  }

  const uploaded = [];
  for (const file of list) {
    const path = `evidence/${schoolScope}/${batchId}/${Date.now()}-${safeFileName(file.name)}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    uploaded.push({
      name: file.name,
      path,
      school_scope: schoolScope,
      contentType: file.type || 'application/octet-stream',
    });
  }
  return uploaded;
}

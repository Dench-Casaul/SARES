import { query, where } from 'firebase/firestore';
import { getAllowedSchoolScopes } from './schoolScope';

export function queryForUserScope(collectionReference, profile) {
  const allowedScopes = getAllowedSchoolScopes(profile);
  if (allowedScopes === null) return collectionReference;

  return query(
    collectionReference,
    where('school_scope', 'in', allowedScopes.length > 0 ? allowedScopes : ['__no_access__'])
  );
}

import { createContext, useContext } from 'react';

// Value shape: { userProfile, authReady, rulesStatus, ruleRevision }
// rulesStatus: 'loading' | 'ready' | 'error'. Recording a case requires 'ready'.
// ruleRevision increments whenever the handbook rules change.
export const AuthProfileContext = createContext(null);

export function useAuthProfile() {
  const context = useContext(AuthProfileContext);
  if (!context) {
    throw new Error('useAuthProfile must be used inside AuthProfileContext.');
  }
  return context;
}

import { createContext, useContext } from 'react';

// Value shape: { userProfile, authReady }
export const AuthProfileContext = createContext(null);

export function useAuthProfile() {
  const context = useContext(AuthProfileContext);
  if (!context) {
    throw new Error('useAuthProfile must be used inside AuthProfileContext.');
  }
  return context;
}

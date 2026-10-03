import { createContext, useContext } from 'react';

export const AuthProfileContext = createContext(null);

export function useAuthProfile() {
  const context = useContext(AuthProfileContext);
  if (!context) {
    throw new Error('useAuthProfile must be used inside AuthProfileContext.');
  }
  return context;
}

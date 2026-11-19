import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthProfile } from './authContext'
import { endSession } from './session'

// Shared Logout action for every page: records the sign-out, ends the session,
// then returns to the login page.
export function useLogout() {
  const navigate = useNavigate()
  const { userProfile } = useAuthProfile()

  return useCallback(async () => {
    await endSession(userProfile)
    navigate('/login')
  }, [navigate, userProfile])
}

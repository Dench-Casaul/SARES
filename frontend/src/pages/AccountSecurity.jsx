import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthProfile } from '../authContext';
import { ACTIVITY_ACTIONS, recordActivity } from '../activityLog';
import '../css/AccountSecurity.css';

export default function AccountSecurity() {
  const { userProfile } = useAuthProfile();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 12) {
      setError('Use a password with at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Choose a password different from your current password.');
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      setError('Your session is unavailable. Sign in again and retry.');
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await recordActivity(userProfile, ACTIVITY_ACTIONS.PASSWORD_UPDATED, 'session');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('Password updated successfully.');
    } catch (updateError) {
      console.error('Password update failed:', updateError);
      setError(updateError.code === 'auth/wrong-password' || updateError.code === 'auth/invalid-credential'
        ? 'Current password is incorrect.'
        : 'Could not update the password. Sign in again if your session has expired.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="account-security-page">
      <header className="account-security-header">
        <Link to="/sares/dashboard" className="account-back-link"><ArrowLeft size={17} /> Dashboard</Link>
        <span className="account-security-mark"><ShieldCheck size={20} /> SARES account</span>
      </header>
      <section className="account-security-content">
        <div className="account-security-heading">
          <span className="account-security-icon"><KeyRound size={22} /></span>
          <div>
            <h1>Account Security</h1>
            <p>{userProfile?.email || auth.currentUser?.email || ''}</p>
          </div>
        </div>
        <form className="account-password-form" onSubmit={handleSubmit}>
          <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
          <label>New password<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
          {error && <p className="account-security-error" role="alert">{error}</p>}
          {message && <p className="account-security-message" role="status">{message}</p>}
          <button type="submit" disabled={saving}><KeyRound size={16} /> {saving ? 'Updating...' : 'Update password'}</button>
        </form>
      </section>
    </main>
  );
}

import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { CheckCircle, KeyRound } from 'lucide-react';
import AppShell from '../AppShell';
import { auth } from '../firebase';
import { useAuthProfile } from '../authContext';
import { ACTIVITY_ACTIONS, recordActivity } from '../activityLog';
import { IDLE_TIMEOUT_MS } from '../session';
import '../css/AccountSecurity.css';

const ROLE_LABELS = { superadmin: 'Superadmin', counselor: 'Counselor' };
const SCOPE_LABELS = { elementary: 'Elementary', high_school: 'High School', all: 'All schools' };

export default function AccountSecurity() {
  const { userProfile } = useAuthProfile();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const email = userProfile?.email || auth.currentUser?.email || '';
  const idleMinutes = Math.round(IDLE_TIMEOUT_MS / 60000);

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
    <AppShell>
      <header className="app-page-heading">
        <h1 className="app-page-title">Account Security</h1>
        <p className="app-page-sub">Review your account and change your password.</p>
      </header>

      <div className="account-grid">
        <section className="account-card">
          <div className="account-card-heading">
            <span className="account-card-icon"><KeyRound size={22} aria-hidden="true" /></span>
            <div>
              <h2>Change password</h2>
              <p>Enter your current password to confirm it's you.</p>
            </div>
          </div>
          <form className="account-password-form" data-help-target="account-password" onSubmit={handleSubmit}>
            <label>Current password<input data-help-target="account-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
            <div className="account-password-row">
              <label>New password<input data-help-target="account-new-password" type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
              <label>Confirm new password<input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
            </div>
            {error && <p className="account-security-error" role="alert">{error}</p>}
            {message && <p className="account-security-message" role="status">{message}</p>}
            <button type="submit" data-help-target="account-password-submit" disabled={saving}><KeyRound size={16} aria-hidden="true" /> {saving ? 'Updating...' : 'Update password'}</button>
          </form>
        </section>

        <div className="account-side">
          <section className="account-card" aria-labelledby="account-details-title">
            <h2 id="account-details-title" className="account-card-title">Account details</h2>
            <dl className="account-details">
              <div><dt>Name</dt><dd>{userProfile?.full_name || '—'}</dd></div>
              <div><dt>Email</dt><dd>{email || '—'}</dd></div>
              <div><dt>Role</dt><dd>{ROLE_LABELS[userProfile?.role] || '—'}</dd></div>
              <div><dt>School access</dt><dd>{SCOPE_LABELS[userProfile?.school_scope] || '—'}</dd></div>
            </dl>
          </section>

          <section className="account-card" aria-labelledby="account-tips-title">
            <h2 id="account-tips-title" className="account-card-title">Password requirements</h2>
            <ul className="account-tips">
              <li><CheckCircle size={15} aria-hidden="true" />At least 12 characters. A short phrase is easier to remember than random symbols.</li>
              <li><CheckCircle size={15} aria-hidden="true" />Different from your current password, and not reused from another account.</li>
              <li><CheckCircle size={15} aria-hidden="true" />SARES signs you out after {idleMinutes} minutes of inactivity. Always log out on shared computers.</li>
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

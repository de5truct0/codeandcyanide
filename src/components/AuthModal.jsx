import React, { useState } from 'react';
import { signUp, signIn, signInWithGitHub, continueAsGuest } from '../services/auth';

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (mode === 'signup') {
        result = await signUp(email, password);
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.user) {
        onSuccess(result.user);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithGitHub();
      if (error) {
        setError(error);
      }
      // OAuth will redirect, so we don't need to handle success here
    } catch (err) {
      setError('Failed to sign in with GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    const guest = continueAsGuest();
    onSuccess(guest);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <h2 className="modal-title">
          {mode === 'signup' ? 'Create Account' : 'Sign In'}
        </h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="form-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              disabled={loading}
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="form-error">{error}</div>
          )}

          <button
            type="submit"
            className="cy-btn primary full-width"
            disabled={loading}
          >
            {loading ? 'Loading...' : mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-alternatives">
          <button
            onClick={handleGitHub}
            className="cy-btn github full-width"
            disabled={loading}
          >
            Continue with GitHub
          </button>

          <button
            onClick={handleGuest}
            className="cy-btn secondary full-width"
            disabled={loading}
          >
            Continue as Guest
          </button>
        </div>

        <div className="auth-switch">
          {mode === 'signin' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="link-btn"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="link-btn"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;

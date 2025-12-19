import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTrack } from '../services/tracks';
import { getCurrentUser } from '../services/auth';
import { lint, formatLintErrors } from '../strudel/lint';
import { useAudio } from '../audio/AudioContext';
import AuthModal from '../components/AuthModal';

function Upload() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState(`// Your Strudel pattern
setcps(0.5);

$: s("bd sd")
   .bank("RolandTR909")
   .analyze(1)
`);
  const [error, setError] = useState(null);
  const [lintErrors, setLintErrors] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(null);
  const { initialize, isInitialized, play, stop, isPlaying } = useAudio();
  const [theme] = useState(() => localStorage.getItem('theme') || 'acid');
  const textareaRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const handleLint = () => {
    const result = lint(code);
    if (!result.ok) {
      setLintErrors(formatLintErrors(result));
      return false;
    }
    setLintErrors(null);
    return true;
  };

  const handlePreview = async () => {
    if (!handleLint()) {
      return;
    }

    if (!isInitialized) {
      await initialize();
    }

    // Note: For a proper preview, we'd need to integrate with the REPL
    // For now, we just validate the code
    alert('Code validation passed! Open the editor to hear it live.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || user.isGuest) {
      setShowAuthModal(true);
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!code.trim()) {
      setError('Please enter some code');
      return;
    }

    if (!handleLint()) {
      setError('Please fix the lint errors before uploading');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { track, error: createError } = await createTrack({
        title: title.trim(),
        code: code.trim(),
        author_id: user.id,
      });

      if (createError) {
        setError(createError);
        return;
      }

      navigate('/explore');
    } catch (err) {
      setError('Failed to upload track. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthSuccess = (authUser) => {
    setUser(authUser);
    setShowAuthModal(false);
  };

  return (
    <div className="upload-page">
      <div className="scan-line-anim"></div>

      <div className="upload-header">
        <div className="upload-nav">
          <Link to="/" className="nav-link">HOME</Link>
          <span className="nav-separator">/</span>
          <Link to="/explore" className="nav-link">EXPLORE</Link>
          <span className="nav-separator">/</span>
          <span className="nav-current">UPLOAD</span>
        </div>
        <h1 className="upload-title">Upload Track</h1>
        <p className="upload-subtitle">Share your Strudel pattern with the community</p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Track Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Awesome Pattern"
            className="form-input"
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label htmlFor="code">Strudel Code</label>
          <textarea
            ref={textareaRef}
            id="code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setLintErrors(null);
            }}
            placeholder="// Your Strudel pattern here"
            className="form-textarea code-textarea"
            rows={15}
            spellCheck={false}
          />
        </div>

        {lintErrors && (
          <div className="lint-errors">
            <pre>{lintErrors}</pre>
          </div>
        )}

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            onClick={handleLint}
            className="cy-btn secondary"
          >
            VALIDATE CODE
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="cy-btn secondary"
          >
            PREVIEW
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="cy-btn primary"
          >
            {isSubmitting ? 'UPLOADING...' : 'UPLOAD TRACK'}
          </button>
        </div>

        {(!user || user.isGuest) && (
          <div className="auth-notice">
            <p>You need to sign in to upload tracks.</p>
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="cy-btn secondary"
            >
              SIGN IN
            </button>
          </div>
        )}
      </form>

      <div className="upload-tips">
        <h3>Tips for a great track:</h3>
        <ul>
          <li>Use <code>$:</code> prefix for pattern lines</li>
          <li>Add <code>.analyze(1)</code> for visualization</li>
          <li>Keep parameter values within safe ranges</li>
          <li>Use <code>s()</code> for samples, <code>n()</code> for synths</li>
        </ul>
      </div>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

export default Upload;

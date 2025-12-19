import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTrack } from '../services/tracks';
import { getCurrentUser } from '../services/auth';
import { lint, formatLintErrors } from '../strudel/lint';
import AuthModal from '../components/AuthModal';

const STORAGE_KEY = 'strudel_files';

function Upload() {
  const navigate = useNavigate();
  const [localFiles, setLocalFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [lintErrors, setLintErrors] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState(null);
  const [theme] = useState(() => localStorage.getItem('theme') || 'acid');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadUser();
    loadLocalFiles();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadLocalFiles = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const files = JSON.parse(saved);
        setLocalFiles(files);
      }
    } catch (e) {
      console.error('Failed to load local files:', e);
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setTitle(file.name.replace('.strudel', ''));
    setError(null);
    setLintErrors(null);
  };

  const handleLint = () => {
    if (!selectedFile) return false;
    const result = lint(selectedFile.code);
    if (!result.ok) {
      setLintErrors(formatLintErrors(result));
      return false;
    }
    setLintErrors(null);
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || user.isGuest) {
      setShowAuthModal(true);
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
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
        code: selectedFile.code.trim(),
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

  const getCodePreview = (code) => {
    const lines = code.split('\n').slice(0, 5);
    return lines.join('\n') + (code.split('\n').length > 5 ? '\n...' : '');
  };

  return (
    <div className="upload-page">
      <div className="scan-line-anim"></div>

      <div className="page-nav">
        <Link to="/" className="site-logo site-logo-medium">CODE&CYANIDE</Link>
        <nav className="breadcrumb-nav">
          <Link to="/" className="nav-link">HOME</Link>
          <span className="nav-separator">/</span>
          <Link to="/explore" className="nav-link">EXPLORE</Link>
          <span className="nav-separator">/</span>
          <span className="nav-current">UPLOAD</span>
        </nav>
        <div className="nav-spacer"></div>
      </div>

      <div className="upload-header">
        <h1 className="upload-title">Upload Track</h1>
        <p className="upload-subtitle">Select a pattern from your editor to share</p>
      </div>

      {(!user || user.isGuest) && (
        <div className="auth-notice">
          <p>You need to sign in to upload tracks.</p>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="cy-btn primary"
          >
            SIGN IN
          </button>
        </div>
      )}

      {user && !user.isGuest && (
        <>
          {localFiles.length === 0 ? (
            <div className="no-files-notice">
              <div className="no-files-icon">&#128196;</div>
              <h3>No Local Files Found</h3>
              <p>Create some patterns in the Editor first, then come back to upload them!</p>
              <Link to="/editor" className="cy-btn primary">
                OPEN EDITOR
              </Link>
            </div>
          ) : (
            <>
              <div className="file-picker-section">
                <h2 className="section-title">Your Files</h2>
                <p className="section-subtitle">Click to select a file to upload</p>

                <div className="file-picker-grid">
                  {localFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`file-picker-card ${selectedFile?.id === file.id ? 'selected' : ''}`}
                      onClick={() => handleFileSelect(file)}
                    >
                      <div className="file-card-header">
                        <span className="file-icon">&#128196;</span>
                        <h4 className="file-name">{file.name}</h4>
                      </div>
                      <pre className="file-preview-code">{getCodePreview(file.code)}</pre>
                      {selectedFile?.id === file.id && (
                        <div className="selected-badge">SELECTED</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedFile && (
                <form className="upload-form" onSubmit={handleSubmit}>
                  <div className="selected-file-preview">
                    <h3>Ready to Upload</h3>
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

                    <div className="code-preview-box">
                      <div className="code-preview-header">
                        <span>Code Preview</span>
                        <span className="line-count">{selectedFile.code.split('\n').length} lines</span>
                      </div>
                      <pre className="code-preview-content">{selectedFile.code}</pre>
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
                        onClick={() => setSelectedFile(null)}
                        className="cy-btn secondary"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={handleLint}
                        className="cy-btn secondary"
                      >
                        VALIDATE
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="cy-btn primary"
                      >
                        {isSubmitting ? 'UPLOADING...' : 'UPLOAD TRACK'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </>
          )}
        </>
      )}

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

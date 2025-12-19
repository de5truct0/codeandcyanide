import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LikeButton from './LikeButton';
import CodePreview from './CodePreview';
import Player from './Player';
import MiniWaveform from './MiniWaveform';

const STORAGE_KEY = 'strudel_files';

function TrackCard({ track, onPlay, isCurrentlyPlaying }) {
  const navigate = useNavigate();
  const [showCode, setShowCode] = useState(false);
  const [saved, setSaved] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSaveToEditor = () => {
    try {
      const savedFiles = localStorage.getItem(STORAGE_KEY);
      const files = savedFiles ? JSON.parse(savedFiles) : [];

      // Check if already saved
      const exists = files.some(f => f.name === `${track.title}.strudel`);
      if (exists) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        return;
      }

      const newFile = {
        id: Date.now(),
        name: `${track.title}.strudel`,
        code: track.code,
      };

      files.push(newFile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save to editor:', e);
    }
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking on interactive elements
    if (e.target.closest('.play-btn, .like-btn, .save-btn, .code-toggle-btn, .track-actions')) {
      return;
    }
    navigate(`/track/${track.id}`);
  };

  return (
    <div className={`track-card social ${isCurrentlyPlaying ? 'playing' : ''}`}>
      {/* Waveform Area - Clickable */}
      <div className="track-waveform-area clickable" onClick={handleCardClick}>
        <MiniWaveform isPlaying={isCurrentlyPlaying} trackId={track.id} />
        <div className="play-overlay" onClick={(e) => e.stopPropagation()}>
          <Player
            code={track.code}
            trackId={track.id}
            onPlay={onPlay}
          />
        </div>
      </div>

      {/* Track Info - Clickable */}
      <div className="track-info clickable" onClick={handleCardClick}>
        <h3 className="track-title">{track.title}</h3>
        <span className="track-author">@{track.author_name || 'anonymous'}</span>
      </div>

      {/* Actions Bar */}
      <div className="track-actions">
        <LikeButton trackId={track.id} initialLikes={track.likes_count} />

        <button
          className={`save-btn ${saved ? 'saved' : ''}`}
          onClick={handleSaveToEditor}
          title="Save to Editor"
        >
          {saved ? '✓ Saved' : '+ Save'}
        </button>

        <button
          className="code-toggle-btn"
          onClick={() => setShowCode(!showCode)}
        >
          {showCode ? '</>' : '</>'}
        </button>

        <span className="track-date">{formatDate(track.created_at)}</span>
      </div>

      {/* Code Preview */}
      {showCode && (
        <div className="track-code-section">
          <CodePreview code={track.code} />
        </div>
      )}
    </div>
  );
}

export default TrackCard;

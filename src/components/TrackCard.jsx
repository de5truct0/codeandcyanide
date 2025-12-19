import React, { useState } from 'react';
import { useAudio } from '../audio/AudioContext';
import LikeButton from './LikeButton';
import CodePreview from './CodePreview';
import Player from './Player';

function TrackCard({ track, onPlay }) {
  const [showCode, setShowCode] = useState(false);
  const { isPlaying } = useAudio();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="track-card">
      <div className="track-card-header">
        <h3 className="track-title">{track.title}</h3>
        <span className="track-author">by {track.author_name || 'Anonymous'}</span>
      </div>

      <div className="track-card-body">
        <Player
          code={track.code}
          trackId={track.id}
          onPlay={onPlay}
        />
      </div>

      <div className="track-card-footer">
        <div className="track-stats">
          <LikeButton trackId={track.id} initialLikes={track.likes_count} />
          <span className="track-date">{formatDate(track.created_at)}</span>
        </div>
        <button
          className="code-toggle"
          onClick={() => setShowCode(!showCode)}
        >
          {showCode ? 'Hide Code' : 'View Code'}
        </button>
      </div>

      {showCode && (
        <CodePreview code={track.code} />
      )}
    </div>
  );
}

export default TrackCard;

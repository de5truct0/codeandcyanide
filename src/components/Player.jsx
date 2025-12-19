import React, { useState, useEffect } from 'react';
import { useAudio } from '../audio/AudioContext';

// Track which track is currently playing globally
let currentPlayingTrackId = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

function Player({ code, trackId, onPlay }) {
  const { initialize, isInitialized, stop } = useAudio();
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subscribe to global playing state changes
  useEffect(() => {
    const handleUpdate = () => {
      setIsPlaying(currentPlayingTrackId === trackId);
    };
    listeners.add(handleUpdate);
    return () => listeners.delete(handleUpdate);
  }, [trackId]);

  const handlePlay = async () => {
    if (isPlaying) {
      // Stop this track
      stop();
      currentPlayingTrackId = null;
      notifyListeners();
      return;
    }

    setLoading(true);

    try {
      // Stop any other playing track first
      if (currentPlayingTrackId !== null) {
        stop();
      }

      // Initialize audio if needed
      if (!isInitialized) {
        await initialize();
      }

      if (onPlay) {
        await onPlay();
      }

      // For now, we just mark as playing - actual playback would need REPL integration
      // In a real implementation, we'd create a temporary REPL instance
      currentPlayingTrackId = trackId;
      notifyListeners();

      // Show a message that they should open the editor
      console.log('To play this track, copy the code to the editor');
    } catch (error) {
      console.error('Failed to play:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="player">
      <button
        className={`play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={handlePlay}
        disabled={loading}
      >
        {loading ? (
          <span className="loading-icon">...</span>
        ) : isPlaying ? (
          <span className="pause-icon">■</span>
        ) : (
          <span className="play-icon">▶</span>
        )}
      </button>
      <div className="player-info">
        <span className="player-status">
          {isPlaying ? 'Playing' : 'Click to preview'}
        </span>
      </div>
    </div>
  );
}

export default Player;

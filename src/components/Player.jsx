import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../audio/AudioContext';

// Track which track is currently playing globally
let currentPlayingTrackId = null;
let currentRepl = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// Stop currently playing track
export function stopCurrentTrack() {
  if (currentRepl) {
    try {
      currentRepl.stop();
      if (window.hush) window.hush();
    } catch (e) {
      console.error('Error stopping:', e);
    }
    currentRepl = null;
  }
  currentPlayingTrackId = null;
  notifyListeners();
}

function Player({ code, trackId, onPlay }) {
  const { initialize, isInitialized } = useAudio();
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Subscribe to global playing state changes
  useEffect(() => {
    const handleUpdate = () => {
      setIsPlaying(currentPlayingTrackId === trackId);
    };
    listeners.add(handleUpdate);
    return () => listeners.delete(handleUpdate);
  }, [trackId]);

  // Cleanup hidden container on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  const handlePlay = async () => {
    if (isPlaying) {
      // Stop this track
      stopCurrentTrack();
      return;
    }

    setLoading(true);

    try {
      // Stop any other playing track first
      if (currentPlayingTrackId !== null) {
        stopCurrentTrack();
      }

      // Initialize audio if needed
      if (!isInitialized) {
        await initialize();
      }

      if (onPlay) {
        await onPlay();
      }

      // Dynamic import Strudel modules
      const { StrudelMirror } = await import('@strudel/codemirror');
      const { webaudioOutput, getAudioContext, initAudio } = await import('@strudel/webaudio');
      const { transpiler } = await import('@strudel/transpiler');
      const { prebake } = await import('@strudel/repl/prebake.mjs');

      // Ensure audio is ready
      await initAudio();
      const audioContext = getAudioContext();

      // Create a hidden container for the REPL - must be truly invisible
      if (!containerRef.current) {
        containerRef.current = document.createElement('div');
        containerRef.current.style.cssText = `
          position: fixed !important;
          left: -99999px !important;
          top: -99999px !important;
          width: 1px !important;
          height: 1px !important;
          overflow: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        `;
        containerRef.current.setAttribute('aria-hidden', 'true');
        document.body.appendChild(containerRef.current);
      }

      // Create REPL instance
      const repl = new StrudelMirror({
        defaultOutput: webaudioOutput,
        getTime: () => audioContext.currentTime,
        transpiler,
        root: containerRef.current,
        initialCode: code,
        prebake,
        solo: true,
      });

      // Evaluate and play
      await repl.evaluate(code);

      currentRepl = repl;
      currentPlayingTrackId = trackId;
      notifyListeners();
    } catch (error) {
      console.error('Failed to play:', error);
      stopCurrentTrack();
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
          <span className="loading-spinner"></span>
        ) : isPlaying ? (
          <span className="pause-icon">&#9632;</span>
        ) : (
          <span className="play-icon">&#9654;</span>
        )}
      </button>
    </div>
  );
}

export default Player;

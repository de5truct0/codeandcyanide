import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTracks } from '../services/tracks';
import { useAudio } from '../audio/AudioContext';
import TrackCard from '../components/TrackCard';

function Explore() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const { initialize, isInitialized } = useAudio();
  const [theme] = useState(() => localStorage.getItem('theme') || 'acid');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const data = await getTracks();
      setTracks(data);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!isInitialized) {
      await initialize();
    }
  };

  const filteredTracks = tracks
    .filter(track => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        track.title.toLowerCase().includes(query) ||
        (track.author_name || '').toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'popular') {
        return b.likes_count - a.likes_count;
      }
      return 0;
    });

  return (
    <div className="explore-page">
      <div className="scan-line-anim"></div>

      <div className="explore-header">
        <div className="explore-nav">
          <Link to="/" className="nav-link">HOME</Link>
          <span className="nav-separator">/</span>
          <span className="nav-current">EXPLORE</span>
        </div>
        <h1 className="explore-title">Track Catalogue</h1>
        <p className="explore-subtitle">Discover community-created Strudel patterns</p>
      </div>

      <div className="explore-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="sort-controls">
          <span>Sort by:</span>
          <button
            className={`sort-btn ${sortBy === 'recent' ? 'active' : ''}`}
            onClick={() => setSortBy('recent')}
          >
            Recent
          </button>
          <button
            className={`sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
            onClick={() => setSortBy('popular')}
          >
            Popular
          </button>
        </div>
        <Link to="/upload" className="cy-btn upload-btn">
          UPLOAD TRACK
        </Link>
      </div>

      {loading ? (
        <div className="explore-loading">
          <div className="loading-spinner"></div>
          <p>Loading tracks...</p>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="explore-empty">
          <p>No tracks found</p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="cy-btn secondary">
              Clear Search
            </button>
          )}
          <Link to="/upload" className="cy-btn primary">
            Be the first to upload!
          </Link>
        </div>
      ) : (
        <div className="tracks-grid">
          {filteredTracks.map(track => (
            <TrackCard
              key={track.id}
              track={track}
              onPlay={handleInitialize}
            />
          ))}
        </div>
      )}

      <div className="explore-footer">
        <Link to="/editor" className="cy-btn secondary">
          Open Editor
        </Link>
      </div>
    </div>
  );
}

export default Explore;

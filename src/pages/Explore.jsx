import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getTracks } from '../services/tracks';
import { useAudio } from '../audio/AudioContext';
import TrackCard from '../components/TrackCard';

const TRACKS_PER_PAGE = 12;

function Explore() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const { initialize, isInitialized } = useAudio();
  const [theme] = useState(() => localStorage.getItem('theme') || 'orphic');
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadTracks(true);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreTracks();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, tracks.length]);

  const loadTracks = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setTracks([]);
    }
    try {
      const data = await getTracks(TRACKS_PER_PAGE, 0);
      setTracks(data);
      setHasMore(data.length >= TRACKS_PER_PAGE);
    } catch (error) {
      console.error('Failed to load tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTracks = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await getTracks(TRACKS_PER_PAGE, tracks.length);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setTracks(prev => [...prev, ...data]);
        setHasMore(data.length >= TRACKS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to load more tracks:', error);
    } finally {
      setLoadingMore(false);
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

      <div className="top-bar">
        <div className="logo-section">
          <Link to="/" className="site-logo site-logo-medium">CODE&CYANIDE</Link>
          <nav className="breadcrumb-nav">
            <Link to="/" className="nav-link">HOME</Link>
            <span className="nav-separator">/</span>
            <span className="nav-current">EXPLORE</span>
          </nav>
        </div>
        <div className="top-bar-actions">
          <Link to="/editor" className="cy-btn primary">OPEN EDITOR</Link>
        </div>
      </div>

      <div className="explore-header">
        <h1 className="explore-title">Discover</h1>
        <p className="explore-subtitle">Community-created Strudel patterns</p>
      </div>

      <div className="explore-controls">
        <div className="search-box">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            placeholder="Search tracks or artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === 'recent' ? 'active' : ''}`}
            onClick={() => setSortBy('recent')}
          >
            New
          </button>
          <button
            className={`sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
            onClick={() => setSortBy('popular')}
          >
            Hot
          </button>
        </div>
        <Link to="/upload" className="cy-btn primary upload-btn">
          + Upload
        </Link>
      </div>

      {loading ? (
        <div className="explore-loading">
          <div className="loading-spinner"></div>
          <p>Loading tracks...</p>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div className="explore-empty">
          <div className="empty-icon">&#127925;</div>
          <h3>No tracks found</h3>
          {searchQuery ? (
            <button onClick={() => setSearchQuery('')} className="cy-btn secondary">
              Clear Search
            </button>
          ) : (
            <p>Be the first to share a pattern!</p>
          )}
          <Link to="/upload" className="cy-btn primary">
            Upload Track
          </Link>
        </div>
      ) : (
        <>
          <div className="tracks-grid social">
            {filteredTracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                onPlay={handleInitialize}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={loadMoreRef} className="load-more-sentinel">
              {loadingMore && (
                <div className="explore-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading more...</p>
                </div>
              )}
            </div>
          )}

          {!hasMore && tracks.length > 0 && (
            <div className="end-of-tracks">
              <p>You've reached the end</p>
            </div>
          )}
        </>
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

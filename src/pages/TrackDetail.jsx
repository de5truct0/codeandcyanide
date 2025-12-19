import React, { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTrackById, getComments, getCommentsCount, addComment } from '../services/tracks';
import { useAudio } from '../audio/AudioContext';
import Player from '../components/Player';
import LikeButton from '../components/LikeButton';
import CodePreview from '../components/CodePreview';
import MiniWaveform from '../components/MiniWaveform';

const COMMENTS_PER_PAGE = 15;

function TrackDetail() {
  const { id } = useParams();
  const [track, setTrack] = useState(null);
  const [comments, setComments] = useState([]);
  const [totalComments, setTotalComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const { initialize, isInitialized } = useAudio();
  const [theme] = useState(() => localStorage.getItem('theme') || 'acid');
  const commentsEndRef = useRef(null);
  const observerRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadTrack();
    loadComments(true);
    loadCommentsCount();
  }, [id]);

  // Infinite scroll for comments
  useEffect(() => {
    if (loadingComments || loadingMoreComments || !hasMoreComments) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreComments && !loadingMoreComments) {
          loadMoreComments();
        }
      },
      { threshold: 0.1 }
    );

    if (commentsEndRef.current) {
      observerRef.current.observe(commentsEndRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadingComments, loadingMoreComments, hasMoreComments, comments.length]);

  const loadTrack = async () => {
    setLoading(true);
    try {
      const data = await getTrackById(id);
      setTrack(data);
    } catch (error) {
      console.error('Failed to load track:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCommentsCount = async () => {
    try {
      const count = await getCommentsCount(id);
      setTotalComments(count);
    } catch (error) {
      console.error('Failed to load comments count:', error);
    }
  };

  const loadComments = async (reset = false) => {
    if (reset) {
      setLoadingComments(true);
      setComments([]);
    }
    try {
      const data = await getComments(id, COMMENTS_PER_PAGE, 0);
      setComments(data);
      setHasMoreComments(data.length >= COMMENTS_PER_PAGE);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const loadMoreComments = async () => {
    if (loadingMoreComments || !hasMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const data = await getComments(id, COMMENTS_PER_PAGE, comments.length);
      if (data.length === 0) {
        setHasMoreComments(false);
      } else {
        setComments(prev => [...prev, ...data]);
        setHasMoreComments(data.length >= COMMENTS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to load more comments:', error);
    } finally {
      setLoadingMoreComments(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const comment = await addComment(id, newComment.trim());
      if (comment) {
        setComments(prev => [...prev, comment]);
        setTotalComments(prev => prev + 1);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitialize = async () => {
    if (!isInitialized) {
      await initialize();
    }
  };

  const handleToggleCode = () => {
    const willShow = !showCode;
    setShowCode(willShow);

    if (willShow) {
      // Scroll to code section after it renders
      setTimeout(() => {
        codeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <div className="track-detail-page">
        <div className="scan-line-anim"></div>
        <div className="explore-loading">
          <div className="loading-spinner"></div>
          <p>Loading track...</p>
        </div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="track-detail-page">
        <div className="scan-line-anim"></div>
        <div className="track-not-found">
          <h2>Track not found</h2>
          <Link to="/explore" className="cy-btn secondary">
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="track-detail-page">
      <div className="scan-line-anim"></div>

      <div className="page-nav">
        <Link to="/" className="site-logo site-logo-medium">CODE&CYANIDE</Link>
        <nav className="breadcrumb-nav">
          <Link to="/" className="nav-link">HOME</Link>
          <span className="nav-separator">/</span>
          <Link to="/explore" className="nav-link">EXPLORE</Link>
          <span className="nav-separator">/</span>
          <span className="nav-current">TRACK</span>
        </nav>
        <div className="nav-spacer"></div>
      </div>

      <div className="track-detail-container">
        {/* Main Track Section */}
        <div className="track-detail-main">
          {/* Large Waveform / Player Area */}
          <div className="track-detail-waveform">
            <MiniWaveform trackId={track.id} isPlaying={false} large />
            <div className="track-detail-play-overlay">
              <Player
                code={track.code}
                trackId={track.id}
                onPlay={handleInitialize}
              />
            </div>
          </div>

          {/* Track Info */}
          <div className="track-detail-info">
            <h1 className="track-detail-title">{track.title}</h1>
            <div className="track-detail-meta">
              <span className="track-detail-author">@{track.author_name || 'anonymous'}</span>
              <span className="track-detail-date">{formatDate(track.created_at)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="track-detail-actions">
            <LikeButton trackId={track.id} initialLikes={track.likes_count} />
            <button
              className="cy-btn secondary"
              onClick={handleToggleCode}
            >
              {showCode ? 'Hide Code' : 'View Code'}
            </button>
            <span className="comment-count">{totalComments} comments</span>
          </div>

          {/* Code Section */}
          {showCode && (
            <div className="track-detail-code" ref={codeRef}>
              <CodePreview code={track.code} />
            </div>
          )}
        </div>

        {/* Comments Section */}
        <div className="track-detail-comments">
          <h3 className="comments-title">Comments</h3>

          {/* Comment Form */}
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <textarea
              className="comment-input"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <button
              type="submit"
              className="cy-btn primary"
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </form>

          {/* Comments List */}
          <div className="comments-list">
            {loadingComments ? (
              <div className="comments-loading">
                <div className="loading-spinner"></div>
                <p>Loading comments...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="no-comments">
                <p>No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <>
                {comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">@{comment.author_name}</span>
                      <span className="comment-time">{formatRelativeTime(comment.created_at)}</span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                  </div>
                ))}

                {/* Infinite scroll sentinel */}
                {hasMoreComments && (
                  <div ref={commentsEndRef} className="load-more-comments">
                    {loadingMoreComments && (
                      <div className="comments-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading more...</p>
                      </div>
                    )}
                  </div>
                )}

                {!hasMoreComments && comments.length > 0 && (
                  <div className="end-of-comments">
                    <p>No more comments</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackDetail;

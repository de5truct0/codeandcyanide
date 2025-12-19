import React, { useState, useEffect } from 'react';
import { toggleLike, hasLiked } from '../services/likes';
import { getCurrentUser } from '../services/auth';

function LikeButton({ trackId, initialLikes = 0 }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserAndLikeStatus();
  }, [trackId]);

  const loadUserAndLikeStatus = async () => {
    const user = await getCurrentUser();
    if (user) {
      setUserId(user.id);
      const isLiked = await hasLiked(trackId, user.id);
      setLiked(isLiked);
    }
  };

  const handleToggleLike = async () => {
    if (!userId) {
      // Could show auth modal here
      alert('Please sign in to like tracks');
      return;
    }

    if (loading) return;

    setLoading(true);

    try {
      const { liked: newLikedState, error } = await toggleLike(trackId, userId);

      if (error) {
        console.error('Like error:', error);
        return;
      }

      setLiked(newLikedState);
      setLikes(prev => newLikedState ? prev + 1 : prev - 1);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`like-btn ${liked ? 'liked' : ''}`}
      onClick={handleToggleLike}
      disabled={loading}
      title={liked ? 'Unlike' : 'Like'}
    >
      <span className="like-icon">{liked ? '♥' : '♡'}</span>
      <span className="like-count">{likes}</span>
    </button>
  );
}

export default LikeButton;

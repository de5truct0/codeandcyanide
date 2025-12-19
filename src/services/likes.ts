import { supabase, isSupabaseConfigured } from './supabase';

// In-memory likes storage (for guest mode or when Supabase is not configured)
const inMemoryLikes = new Set<string>();

function getLikeKey(trackId: string, userId: string): string {
  return `${trackId}:${userId}`;
}

export async function hasLiked(trackId: string, userId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || userId.startsWith('guest_')) {
    return inMemoryLikes.has(getLikeKey(trackId, userId));
  }

  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('track_id', trackId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking like:', error);
    return false;
  }

  return !!data;
}

export async function toggleLike(
  trackId: string,
  userId: string
): Promise<{ liked: boolean; error: string | null }> {
  const currentlyLiked = await hasLiked(trackId, userId);

  // Guest users or when Supabase not configured - use in-memory
  if (!isSupabaseConfigured() || userId.startsWith('guest_')) {
    const key = getLikeKey(trackId, userId);
    if (currentlyLiked) {
      inMemoryLikes.delete(key);
      return { liked: false, error: null };
    } else {
      inMemoryLikes.add(key);
      return { liked: true, error: null };
    }
  }

  if (currentlyLiked) {
    // Unlike
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('track_id', trackId)
      .eq('user_id', userId);

    if (error) {
      return { liked: true, error: error.message };
    }

    return { liked: false, error: null };
  } else {
    // Like
    const { error } = await supabase
      .from('likes')
      .insert({
        track_id: trackId,
        user_id: userId,
      });

    if (error) {
      return { liked: false, error: error.message };
    }

    return { liked: true, error: null };
  }
}

export async function getUserLikes(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || userId.startsWith('guest_')) {
    const likes: string[] = [];
    inMemoryLikes.forEach(key => {
      const [trackId, uid] = key.split(':');
      if (uid === userId) {
        likes.push(trackId);
      }
    });
    return likes;
  }

  const { data, error } = await supabase
    .from('likes')
    .select('track_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user likes:', error);
    return [];
  }

  return (data || []).map(like => like.track_id);
}

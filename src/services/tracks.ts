import { supabase, isSupabaseConfigured } from './supabase';

export interface Track {
  id: string;
  title: string;
  author_id: string | null;
  author_name: string | null;
  code: string;
  likes_count: number;
  created_at: string;
}

export interface CreateTrackInput {
  title: string;
  code: string;
  author_id?: string | null;
}

// In-memory fallback storage
let inMemoryTracks: Track[] = [];

export async function getTracks(limit = 20, offset = 0): Promise<Track[]> {
  if (!isSupabaseConfigured()) {
    return inMemoryTracks.slice(offset, offset + limit);
  }

  const { data, error } = await supabase
    .from('tracks')
    .select(`
      *,
      profiles:author_id (username)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }

  return (data || []).map(track => ({
    ...track,
    author_name: track.author_name || track.profiles?.username || 'Anonymous',
  }));
}

export async function getTrackById(id: string): Promise<Track | null> {
  if (!isSupabaseConfigured()) {
    return inMemoryTracks.find(t => t.id === id) || null;
  }

  const { data, error } = await supabase
    .from('tracks')
    .select(`
      *,
      profiles:author_id (username)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching track:', error);
    return null;
  }

  return {
    ...data,
    author_name: data.author_name || data.profiles?.username || 'Anonymous',
  };
}

export async function createTrack(input: CreateTrackInput): Promise<{ track: Track | null; error: string | null }> {
  if (!isSupabaseConfigured()) {
    const newTrack: Track = {
      id: `local_${Date.now()}`,
      title: input.title,
      author_id: input.author_id || null,
      author_name: 'Local User',
      code: input.code,
      likes_count: 0,
      created_at: new Date().toISOString(),
    };
    inMemoryTracks.unshift(newTrack);
    return { track: newTrack, error: null };
  }

  const { data, error } = await supabase
    .from('tracks')
    .insert({
      title: input.title,
      code: input.code,
      author_id: input.author_id || null,
    })
    .select()
    .single();

  if (error) {
    return { track: null, error: error.message };
  }

  return {
    track: {
      ...data,
      author_name: null,
    },
    error: null,
  };
}

export async function deleteTrack(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) {
    inMemoryTracks = inMemoryTracks.filter(t => t.id !== id);
    return { error: null };
  }

  const { error } = await supabase
    .from('tracks')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function searchTracks(query: string): Promise<Track[]> {
  if (!isSupabaseConfigured()) {
    const lowerQuery = query.toLowerCase();
    return inMemoryTracks.filter(
      t => t.title.toLowerCase().includes(lowerQuery) ||
           t.code.toLowerCase().includes(lowerQuery)
    );
  }

  const { data, error } = await supabase
    .from('tracks')
    .select(`
      *,
      profiles:author_id (username)
    `)
    .or(`title.ilike.%${query}%,code.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching tracks:', error);
    return [];
  }

  return (data || []).map(track => ({
    ...track,
    author_name: track.author_name || track.profiles?.username || 'Anonymous',
  }));
}

// Comments
export interface Comment {
  id: string;
  track_id: string;
  user_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

export async function getComments(trackId: string, limit = 20, offset = 0): Promise<Comment[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('track_id', trackId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }

  // Reverse to show oldest first but load newest first for pagination
  return (data || []).reverse();
}

export async function getCommentsCount(trackId: string): Promise<number> {
  if (!isSupabaseConfigured()) {
    return 0;
  }

  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('track_id', trackId);

  if (error) {
    console.error('Error fetching comments count:', error);
    return 0;
  }

  return count || 0;
}

export async function addComment(trackId: string, content: string, authorName = 'Anonymous'): Promise<Comment | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      track_id: trackId,
      content,
      author_name: authorName,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    return null;
  }

  return data;
}

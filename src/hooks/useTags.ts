import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Tag } from '../types';
import { DEFAULT_COLORS } from '../types';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error('Error loading tags:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTag(name: string, color = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]) {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('tags')
        .insert([{ name, color }])
        .select()
        .single();

      if (error) throw error;
      setTags([...tags, data]);
      return data;
    } catch (error: any) {
      console.error('Error creating tag:', error);
      setError(error.message);
      throw error;
    }
  }

  async function updateTag(id: string, updates: Partial<Tag>) {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setTags(tags.map(t => t.id === id ? data : t));
      return data;
    } catch (error: any) {
      console.error('Error updating tag:', error);
      setError(error.message);
      throw error;
    }
  }

  async function deleteTag(id: string) {
    try {
      setError(null);

      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTags(tags.filter(t => t.id !== id));
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      setError(error.message);
      throw error;
    }
  }

  async function assignTagToSnippet(tagId: string, snippetId: string) {
    try {
      setError(null);

      const { error } = await supabase
        .from('code_snippets_tags')
        .insert([{ tag_id: tagId, code_snippet_id: snippetId }]);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error assigning tag:', error);
      setError(error.message);
      throw error;
    }
  }

  async function removeTagFromSnippet(tagId: string, snippetId: string) {
    try {
      setError(null);

      const { error } = await supabase
        .from('code_snippets_tags')
        .delete()
        .match({ tag_id: tagId, code_snippet_id: snippetId });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error removing tag:', error);
      setError(error.message);
      throw error;
    }
  }

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    assignTagToSnippet,
    removeTagFromSnippet,
    refresh: loadTags
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Folder } from '../types';

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      console.error('Error loading folders:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createFolder(name: string, description?: string) {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('folders')
        .insert([{ name, description }])
        .select()
        .single();

      if (error) throw error;
      setFolders([...folders, data]);
      return data;
    } catch (error: any) {
      console.error('Error creating folder:', error);
      setError(error.message);
      throw error;
    }
  }

  async function updateFolder(id: string, updates: Partial<Folder>) {
    try {
      setError(null);

      const { data, error } = await supabase
        .from('folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setFolders(folders.map(f => f.id === id ? data : f));
      return data;
    } catch (error: any) {
      console.error('Error updating folder:', error);
      setError(error.message);
      throw error;
    }
  }

  async function deleteFolder(id: string) {
    try {
      setError(null);

      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setFolders(folders.filter(f => f.id !== id));
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      setError(error.message);
      throw error;
    }
  }

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refresh: loadFolders
  };
}

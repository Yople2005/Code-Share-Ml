import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface FolderTagManagerProps {
  onSelectFolder: (folderId: string | null) => void;
  onSelectTag: (tagName: string | null) => void;
  selectedFolder: string | null;
  selectedTag: string | null;
  isAdmin: boolean;
}

interface Folder {
  id: string;
  name: string;
  year_level: string;
  parent_id: string | null;
  is_chapter: boolean;
  is_exercise: boolean;
}

interface Tag {
  id: string;
  name: string;
}

export function FolderTagManager({
  onSelectFolder,
  onSelectTag,
  selectedFolder,
  selectedTag,
  isAdmin
}: FolderTagManagerProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
    loadTags();
  }, []);

  async function loadFolders() {
    try {
      setLoading(true);
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

  async function loadTags() {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error('Error loading tags:', error);
    }
  }

  // Get chapters for a specific year
  const getChapters = (yearLevel: string) => {
    return folders.filter(folder => 
      folder.year_level === yearLevel && 
      folder.is_chapter && 
      !folder.parent_id
    );
  };

  // Get exercises for a specific chapter
  const getExercises = (chapterId: string) => {
    return folders.filter(folder => 
      folder.parent_id === chapterId && 
      folder.is_exercise
    );
  };

  return (
    <div className="space-y-6">
      {/* Year Level Filter */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Year Level</h3>
        <div className="space-y-2">
          <button
            onClick={() => {
              setSelectedYear(null);
              onSelectFolder(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg border transition duration-200 ${
              !selectedYear ? 'bg-blue-200' : 'hover:bg-gray-200'
            }`}
          >
            All Years
          </button>
          {['2nd Year', '3rd Year'].map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition duration-200 ${
                selectedYear === year ? 'bg-blue-200' : 'hover:bg-gray-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Chapters and Exercises */}
      {selectedYear && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Chapters</h3>
          <div className="space-y-2">
            {getChapters(selectedYear).map((chapter) => (
              <div key={chapter.id} className="space-y-1">
                <button
                  onClick={() => onSelectFolder(chapter.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition duration-200 ${
                    selectedFolder === chapter.id ? 'bg-blue-200' : 'hover:bg-gray-200'
                  }`}
                >
                  {chapter.name}
                </button>
                {/* Show exercises under the chapter */}
                <div className="pl-4 space-y-1">
                  {getExercises(chapter.id).map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => onSelectFolder(exercise.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition duration-200 ${
                        selectedFolder === exercise.id ? 'bg-blue-200' : 'hover:bg-gray-200'
                      }`}
                    >
                      {exercise.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Filter */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Tags</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectTag(null)}
            className={`px-3 py-1 rounded-full text-sm ${
              !selectedTag ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            All Tags
          </button>
          {tags.filter(tag => tag.name !== 'untagged').map((tag) => (
            <button
              key={tag.id}
              onClick={() => onSelectTag(tag.name)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTag === tag.name
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
